/**
 * 상담 신청(leads) 데이터 접근 — 서버 전용
 */
import sql from 'mssql';
import { getPool } from '@/lib/db';
import { logger } from '@/lib/logger';
import type { LeadInput } from '@/lib/validations';
import type { Lead, LeadStatus } from '@/types/lead';

// 개인정보 보호법 제21조 — 보유 기간(1년)이 지난 상담 신청 정보 파기.
// scripts/purge-expired-leads.sql도 동일한 1년 기준을 사용한다.
export const PURGE_EXPIRED_LEADS_SQL = 'DELETE FROM leads WHERE created_at < DATEADD(year, -1, SYSUTCDATETIME())';

const PURGE_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24시간
let lastPurgeAt = 0;

export async function insertLead(input: LeadInput): Promise<number> {
    void maybePurgeExpiredLeads();
    const pool = await getPool();
    const r = await pool.request()
        .input('name', sql.NVarChar(50), input.name)
        .input('phone', sql.VarChar(20), input.phone)
        .input('region', sql.NVarChar(50), input.region)
        .input('desired_job', sql.NVarChar(100), input.desiredJob)
        .input('source', sql.VarChar(20), input.source)
        .input('payload', sql.NVarChar(sql.MAX), JSON.stringify(input.payload))
        // mssql 드라이버는 DATETIME2를 UTC로 해석하므로, 저장도 UTC(SYSUTCDATETIME)로 맞춘다.
        // created_at의 DDL 기본값도 SYSUTCDATETIME()이지만, 변경 이전에 만들어진 DB에는
        // 과거 기본값(로컬 시간)이 남아있을 수 있어 여기서 명시적으로 넘겨 UTC를 보장한다.
        .query(`INSERT INTO leads (name, phone, region, desired_job, source, payload, consent_at, created_at)
                OUTPUT INSERTED.id VALUES (@name, @phone, @region, @desired_job, @source, @payload, SYSUTCDATETIME(), SYSUTCDATETIME())`);
    return r.recordset[0].id as number;
}

// ponytail: 최근 500건 고정 조회. 리드가 늘면 페이지네이션 추가
export async function getLeads(status?: LeadStatus): Promise<Lead[]> {
    void maybePurgeExpiredLeads();
    const pool = await getPool();
    const req = pool.request();
    let where = '';
    if (status) {
        req.input('status', sql.VarChar(20), status);
        where = 'WHERE status = @status';
    }
    const r = await req.query(`SELECT TOP 500 * FROM leads ${where} ORDER BY created_at DESC`);
    return r.recordset as Lead[];
}

export async function getLeadById(id: number): Promise<Lead | null> {
    const pool = await getPool();
    const r = await pool.request().input('id', sql.Int, id).query('SELECT * FROM leads WHERE id = @id');
    return (r.recordset[0] as Lead) ?? null;
}

export async function updateLeadStatus(id: number, status: LeadStatus): Promise<boolean> {
    const pool = await getPool();
    const r = await pool.request().input('id', sql.Int, id).input('status', sql.VarChar(20), status)
        .query('UPDATE leads SET status = @status WHERE id = @id');
    return r.rowsAffected[0] > 0;
}

export async function saveLeadReport(id: number, report: string): Promise<boolean> {
    const pool = await getPool();
    const r = await pool.request().input('id', sql.Int, id).input('report', sql.NVarChar(sql.MAX), report)
        .query('UPDATE leads SET report = @report WHERE id = @id');
    return r.rowsAffected[0] > 0;
}

/** 보유 기간(1년)이 지난 상담 신청 정보를 즉시 파기하고 삭제 건수를 반환한다. */
export async function purgeExpiredLeads(): Promise<number> {
    const pool = await getPool();
    const r = await pool.request().query(PURGE_EXPIRED_LEADS_SQL);
    const deleted = r.rowsAffected[0] ?? 0;
    logger.info(`[리드 파기] 보유 기간 경과 ${deleted}건 삭제`);
    return deleted;
}

/**
 * 트래픽이 있을 때(insertLead/getLeads 호출 시)에 한해 24시간에 한 번만 파기를 시도한다.
 * 실패해도 호출자 흐름을 막지 않고 다음 기회에 재시도한다(await하지 않고 호출할 것).
 */
export async function maybePurgeExpiredLeads(): Promise<void> {
    const now = Date.now();
    if (now - lastPurgeAt < PURGE_INTERVAL_MS) return;
    lastPurgeAt = now;
    try {
        await purgeExpiredLeads();
    } catch (error) {
        lastPurgeAt = 0; // 실패 시 다음 호출에서 재시도
        logger.error('[리드 파기] 자동 파기 실패:', error);
    }
}
