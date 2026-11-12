/**
 * 분석 리포트 저장소(analysis_reports / analysis_requests / analysis_library) 데이터 접근 — 서버 전용.
 * 파라미터 바인딩 필수(SQL Injection 방지). getPool()을 재사용한다.
 */
import sql from 'mssql';
import { getPool } from '@/lib/db';
import { logger } from '@/lib/logger';
import type { AnalysisRequest, PublicReport, ReportContent, ReportMeta } from './schema';

export type Actor = { kind: 'anon' } | { kind: 'user'; userId: number } | { kind: 'admin'; username: string };

/** analysis_reports 테이블 한 행 */
export interface StoredReport {
    id: number;
    public_id: string;
    type: AnalysisRequest['type'];
    keyword: string;
    keyword_norm: string;
    scope: AnalysisRequest['scope'];
    include_competitors: boolean;
    include_trends: boolean;
    cache_key: string;
    content: string;
    meta: string;
    model_name: string;
    input_tokens: number;
    output_tokens: number;
    created_at: Date;
    expires_at: Date;
}

export interface InsertReportInput {
    req: AnalysisRequest;
    keywordNorm: string;
    cacheKey: string;
    content: ReportContent;
    meta: ReportMeta;
    modelName: string;
    inputTokens: number;
    outputTokens: number;
    ttlDays: number;
}

export interface ReportListItem {
    id: number;
    public_id: string;
    type: string;
    keyword: string;
    scope: string;
    created_at: Date;
    request_count: number;
}

export interface DashboardTopRow { type: string; keyword: string; cnt: number }

/** 대시보드 "최근 분석" 1건 — 설계서 3.1: 유형·키워드·요청자 구분·요청 시각(IP는 저장·반환하지 않음). */
export interface DashboardRecentItem {
    publicId: string;
    type: AnalysisRequest['type'];
    keyword: string;
    actor: Actor['kind'];
    requestedAt: Date;
}

export interface DashboardStats {
    today: number;
    last7d: number;
    cacheHitRate: number;
    recent: DashboardRecentItem[];
    topJobs: DashboardTopRow[];
    topIndustries: DashboardTopRow[];
}

export const FRESH_REPORT_SQL = 'SELECT TOP 1 * FROM analysis_reports WHERE cache_key = @cacheKey AND expires_at > SYSUTCDATETIME() ORDER BY created_at DESC';

const INSERT_REPORT_SQL = `INSERT INTO analysis_reports (type, keyword, keyword_norm, scope, include_competitors, include_trends, cache_key, content, meta, model_name, input_tokens, output_tokens, created_at, expires_at)
    OUTPUT INSERTED.* VALUES (@type, @keyword, @keywordNorm, @scope, @comp, @trends, @cacheKey, @content, @meta, @model, @inTok, @outTok, SYSUTCDATETIME(), DATEADD(day, @ttl, SYSUTCDATETIME()))`;

const COUNT_USER_TODAY_SQL = 'SELECT COUNT(*) AS c FROM analysis_requests WHERE user_id = @userId AND cache_hit = 0 AND created_at > DATEADD(hour, -24, SYSUTCDATETIME())';
const COUNT_ADMIN_TODAY_SQL = 'SELECT COUNT(*) AS c FROM analysis_requests WHERE admin_username = @username AND cache_hit = 0 AND created_at > DATEADD(hour, -24, SYSUTCDATETIME())';

const LIBRARY_MERGE_SQL = `MERGE analysis_library AS t USING (SELECT @userId AS user_id, @reportId AS report_id) AS s ON t.user_id = s.user_id AND t.report_id = s.report_id
    WHEN NOT MATCHED THEN INSERT (user_id, report_id) VALUES (s.user_id, s.report_id);`;

const REMOVE_LIBRARY_SQL = `DELETE l FROM analysis_library l JOIN analysis_reports r ON r.id = l.report_id
    WHERE l.user_id = @userId AND r.public_id = @publicId`;

const LIST_LIBRARY_SQL = `SELECT r.id, r.public_id, r.type, r.keyword, r.scope, r.created_at,
    (SELECT COUNT(*) FROM analysis_requests q WHERE q.report_id = r.id) AS request_count
    FROM analysis_library l JOIN analysis_reports r ON r.id = l.report_id WHERE l.user_id = @userId ORDER BY l.created_at DESC`;

export const DASHBOARD_TOP_SQL = `SELECT TOP 10 r.type, r.keyword_norm AS keyword, COUNT(*) AS cnt FROM analysis_requests q JOIN analysis_reports r ON r.id = q.report_id
    WHERE r.type = @type AND q.created_at > DATEADD(day, -30, SYSUTCDATETIME()) GROUP BY r.type, r.keyword_norm ORDER BY cnt DESC`;

const DASHBOARD_COUNT_SQL = (windowClause: string) => `SELECT COUNT(*) AS c FROM analysis_requests WHERE cache_hit = 0 AND created_at > ${windowClause}`;
const DASHBOARD_HIT_RATE_SQL = `SELECT COUNT(*) AS total, SUM(CASE WHEN cache_hit = 1 THEN 1 ELSE 0 END) AS hits
    FROM analysis_requests WHERE created_at > DATEADD(day, -30, SYSUTCDATETIME())`;
// 최근 분석은 "요청" 기준(캐시 적중 포함)으로 집계한다 — 설계서 3.1절. IP는 analysis_requests에 저장하지 않으므로 선택하지 않는다.
const DASHBOARD_RECENT_SQL = `SELECT TOP 20 r.public_id, r.type, r.keyword, q.actor, q.created_at
    FROM analysis_requests q JOIN analysis_reports r ON r.id = q.report_id
    ORDER BY q.created_at DESC`;

// ponytail: 목록은 TOP 500 고정, 검색은 LIKE. 리포트가 수천 건을 넘으면 페이지네이션 추가
const LIST_SQL = (where: string) => `SELECT TOP 500 r.id, r.public_id, r.type, r.keyword, r.scope, r.created_at,
    (SELECT COUNT(*) FROM analysis_requests q WHERE q.report_id = r.id) AS request_count FROM analysis_reports r ${where} ORDER BY r.created_at DESC`;

/** MSSQL 오류 번호 208("Invalid object name") — 테이블이 아직 생성되지 않은 경우. */
export function isMissingTableError(err: unknown): boolean {
    return (err as { number?: number } | undefined)?.number === 208;
}

export async function findFreshReport(cacheKey: string): Promise<StoredReport | null> {
    const pool = await getPool();
    const r = await pool.request().input('cacheKey', sql.VarChar(64), cacheKey).query(FRESH_REPORT_SQL);
    return (r.recordset[0] as StoredReport | undefined) ?? null;
}

export async function insertReport(input: InsertReportInput): Promise<StoredReport> {
    const pool = await getPool();
    const r = await pool.request()
        .input('type', sql.VarChar(10), input.req.type)
        .input('keyword', sql.NVarChar(50), input.req.keyword)
        .input('keywordNorm', sql.NVarChar(50), input.keywordNorm)
        .input('scope', sql.VarChar(10), input.req.scope)
        .input('comp', input.req.includeCompetitors)
        .input('trends', input.req.includeTrends)
        .input('cacheKey', sql.VarChar(64), input.cacheKey)
        .input('content', sql.NVarChar(sql.MAX), JSON.stringify(input.content))
        .input('meta', sql.NVarChar(sql.MAX), JSON.stringify(input.meta))
        .input('model', sql.NVarChar(100), input.modelName)
        .input('inTok', sql.Int, input.inputTokens)
        .input('outTok', sql.Int, input.outputTokens)
        .input('ttl', sql.Int, input.ttlDays)
        .query(INSERT_REPORT_SQL);
    return r.recordset[0] as StoredReport;
}

export async function getReportByPublicId(publicId: string): Promise<StoredReport | null> {
    const pool = await getPool();
    const r = await pool.request().input('publicId', sql.NVarChar(36), publicId)
        .query('SELECT * FROM analysis_reports WHERE public_id = @publicId');
    return (r.recordset[0] as StoredReport | undefined) ?? null;
}

export async function getReportById(id: number): Promise<StoredReport | null> {
    const pool = await getPool();
    const r = await pool.request().input('id', sql.Int, id).query('SELECT * FROM analysis_reports WHERE id = @id');
    return (r.recordset[0] as StoredReport | undefined) ?? null;
}

/** 요청 기록 — 실패해도 리포트 생성 흐름을 막지 않는다. */
export async function recordRequest(reportId: number, actor: Actor, cacheHit: boolean): Promise<void> {
    try {
        const pool = await getPool();
        await pool.request()
            .input('reportId', sql.Int, reportId)
            .input('actor', sql.VarChar(10), actor.kind)
            .input('userId', sql.Int, actor.kind === 'user' ? actor.userId : null)
            .input('adminUsername', sql.NVarChar(100), actor.kind === 'admin' ? actor.username : null)
            .input('cacheHit', cacheHit)
            .query(`INSERT INTO analysis_requests (report_id, actor, user_id, admin_username, cache_hit)
                VALUES (@reportId, @actor, @userId, @adminUsername, @cacheHit)`);
    } catch (error) {
        logger.error('[분석] 요청 기록 실패:', error);
    }
}

/** 오늘(최근 24시간) 생성(캐시 미스) 횟수 — user/admin만 집계, anon은 0(메모리 한도로 처리). */
export async function countGenerationsToday(actor: Actor): Promise<number> {
    if (actor.kind === 'anon') return 0;
    const pool = await getPool();
    if (actor.kind === 'user') {
        const r = await pool.request().input('userId', sql.Int, actor.userId).query(COUNT_USER_TODAY_SQL);
        return r.recordset[0]?.c ?? 0;
    }
    const r = await pool.request().input('username', sql.NVarChar(100), actor.username).query(COUNT_ADMIN_TODAY_SQL);
    return r.recordset[0]?.c ?? 0;
}

export async function addToLibrary(userId: number, reportId: number): Promise<void> {
    const pool = await getPool();
    await pool.request().input('userId', sql.Int, userId).input('reportId', sql.Int, reportId).query(LIBRARY_MERGE_SQL);
}

export async function removeFromLibrary(userId: number, publicId: string): Promise<void> {
    const pool = await getPool();
    await pool.request().input('userId', sql.Int, userId).input('publicId', sql.NVarChar(36), publicId).query(REMOVE_LIBRARY_SQL);
}

export async function listLibrary(userId: number): Promise<ReportListItem[]> {
    const pool = await getPool();
    const r = await pool.request().input('userId', sql.Int, userId).query(LIST_LIBRARY_SQL);
    return r.recordset as ReportListItem[];
}

const Q_MAX = 50;

export async function listReports(filter: { type?: AnalysisRequest['type']; q?: string } = {}): Promise<ReportListItem[]> {
    if (filter.q !== undefined && filter.q.length > Q_MAX) {
        throw new Error(`검색어는 ${Q_MAX}자 이내로 입력해 주세요.`);
    }
    const pool = await getPool();
    const request = pool.request();
    const clauses: string[] = [];
    if (filter.type) {
        request.input('type', sql.VarChar(10), filter.type);
        clauses.push('r.type = @type');
    }
    if (filter.q) {
        request.input('q', sql.NVarChar(52), `%${filter.q}%`);
        clauses.push('r.keyword LIKE @q');
    }
    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const r = await request.query(LIST_SQL(where));
    return r.recordset as ReportListItem[];
}

async function dashboardTop(pool: Awaited<ReturnType<typeof getPool>>, type: AnalysisRequest['type']): Promise<DashboardTopRow[]> {
    const r = await pool.request().input('type', sql.VarChar(10), type).query(DASHBOARD_TOP_SQL);
    return r.recordset as DashboardTopRow[];
}

function toRecentItem(row: { public_id: string; type: string; keyword: string; actor: string; created_at: Date }): DashboardRecentItem {
    return {
        publicId: row.public_id,
        type: row.type as AnalysisRequest['type'],
        keyword: row.keyword,
        actor: row.actor as Actor['kind'],
        requestedAt: row.created_at,
    };
}

/** 관리자 대시보드 통계 — 오늘/최근 7일 생성 수, 최근 30일 캐시 적중률, 최근 20건, 직무/산업 상위 10개(30일). */
export async function getDashboard(): Promise<DashboardStats> {
    const pool = await getPool();
    const [today, last7d, hitRate, recent, topJobs, topIndustries] = await Promise.all([
        pool.request().query(DASHBOARD_COUNT_SQL('DATEADD(hour, -24, SYSUTCDATETIME())')),
        pool.request().query(DASHBOARD_COUNT_SQL('DATEADD(day, -7, SYSUTCDATETIME())')),
        pool.request().query(DASHBOARD_HIT_RATE_SQL),
        pool.request().query(DASHBOARD_RECENT_SQL),
        dashboardTop(pool, 'job'),
        dashboardTop(pool, 'industry'),
    ]);
    const hitRow = hitRate.recordset[0] ?? { total: 0, hits: 0 };
    const total = hitRow.total ?? 0;
    return {
        today: today.recordset[0]?.c ?? 0,
        last7d: last7d.recordset[0]?.c ?? 0,
        cacheHitRate: total > 0 ? (hitRow.hits ?? 0) / total : 0,
        recent: (recent.recordset as Array<{ public_id: string; type: string; keyword: string; actor: string; created_at: Date }>).map(toRecentItem),
        topJobs,
        topIndustries,
    };
}

/** 저장된 행을 공개 응답(PublicReport)으로 변환한다. content/meta JSON 파싱 실패 시 throw(호출자가 500 처리). */
export function toPublicReport(row: StoredReport): PublicReport {
    return {
        publicId: row.public_id,
        type: row.type,
        keyword: row.keyword,
        scope: row.scope,
        content: JSON.parse(row.content) as ReportContent,
        meta: JSON.parse(row.meta) as ReportMeta,
        createdAt: new Date(row.created_at).toISOString(),
        expiresAt: new Date(row.expires_at).toISOString(),
    };
}
