import { beforeEach, describe, expect, it, vi } from 'vitest';
import sql, { type ConnectionPool } from 'mssql';

vi.mock('@/lib/db', () => ({ getPool: vi.fn() }));
import { getPool } from '@/lib/db';
import {
    DASHBOARD_TOP_SQL, FRESH_REPORT_SQL,
    addToLibrary, countGenerationsToday, findFreshReport, getDashboard, getReportByPublicId, getReportById,
    insertReport, listLibrary, listReports, recordRequest, removeFromLibrary,
} from './reports';
import type { ReportContent, ReportMeta } from './schema';

// DB 의존 함수는 단위 테스트 대신, 실제 실행되는 SQL 문자열에 핵심 조건이 포함되는지만 확인한다(leads.test.ts 방식).
describe('FRESH_REPORT_SQL', () => {
    it('만료되지 않은 캐시를 최신순으로 1건만 조회한다', () => {
        expect(FRESH_REPORT_SQL).toContain('expires_at > SYSUTCDATETIME()');
        expect(FRESH_REPORT_SQL).toContain('ORDER BY created_at DESC');
    });
});

describe('DASHBOARD_TOP_SQL', () => {
    it('최근 30일 집계 조건을 포함한다', () => {
        expect(DASHBOARD_TOP_SQL).toContain('DATEADD(day, -30');
    });
});

// ---- getPool()을 흉내내는 테스트용 가짜 커넥션 풀 -----------------------------------------
// pool.request()를 호출한 순서대로 resultsQueue의 레코드셋을 반환하고, 각 요청에 바인딩된
// input(name, type?, value) 호출과 실행된 SQL 문자열을 log에 기록한다(실 DB는 사용하지 않음).
interface BoundInput { name: string; type?: unknown; value: unknown }
interface RequestLog { inputs: BoundInput[]; sql: string }

function makeFakePool(resultsQueue: unknown[][] = []) {
    const log: RequestLog[] = [];
    let step = 0;
    const request = () => {
        const idx = step++;
        const entry: RequestLog = { inputs: [], sql: '' };
        log.push(entry);
        const req = {
            input(name: string, a: unknown, b?: unknown) {
                if (b === undefined) entry.inputs.push({ name, value: a });
                else entry.inputs.push({ name, type: a, value: b });
                return req;
            },
            async query(text: string) {
                entry.sql = text;
                const recordset = resultsQueue[idx] ?? [];
                return { recordset, rowsAffected: [recordset.length] };
            },
        };
        return req;
    };
    return { pool: { request } as unknown as ConnectionPool, log };
}

beforeEach(() => {
    vi.mocked(getPool).mockReset();
});

describe('findFreshReport', () => {
    it('cache_key를 VarChar(64)로 바인딩한다(CHAR(64) 컬럼, 인덱스 seek 유지)', async () => {
        const { pool, log } = makeFakePool([[]]);
        vi.mocked(getPool).mockResolvedValue(pool);
        await findFreshReport('a'.repeat(64));
        expect(log[0].inputs).toEqual([{ name: 'cacheKey', type: sql.VarChar(64), value: 'a'.repeat(64) }]);
    });
    it('결과가 없으면 null을 반환한다', async () => {
        const { pool } = makeFakePool([[]]);
        vi.mocked(getPool).mockResolvedValue(pool);
        expect(await findFreshReport('x')).toBeNull();
    });
});

describe('insertReport', () => {
    it('cache_key를 VarChar(64)로 바인딩하고 INSERTED 행을 반환한다', async () => {
        const row = { id: 1, public_id: 'p' };
        const { pool, log } = makeFakePool([[row]]);
        vi.mocked(getPool).mockResolvedValue(pool);
        const req = { type: 'job' as const, keyword: 'k', scope: 'kr' as const, includeCompetitors: true, includeTrends: true };
        const result = await insertReport({
            req, keywordNorm: 'k', cacheKey: 'c'.repeat(64),
            content: { invalid: true, reason: 'x' } as unknown as ReportContent, meta: {} as unknown as ReportMeta,
            modelName: 'm', inputTokens: 1, outputTokens: 2, ttlDays: 7,
        });
        expect(result).toEqual(row);
        const cacheKeyInput = log[0].inputs.find((i) => i.name === 'cacheKey');
        expect(cacheKeyInput).toEqual({ name: 'cacheKey', type: sql.VarChar(64), value: 'c'.repeat(64) });
    });
});

describe('getReportByPublicId / getReportById', () => {
    it('publicId로 조회하고 없으면 null을 반환한다', async () => {
        const { pool, log } = makeFakePool([[]]);
        vi.mocked(getPool).mockResolvedValue(pool);
        expect(await getReportByPublicId('uuid-x')).toBeNull();
        expect(log[0].inputs).toEqual([{ name: 'publicId', type: sql.NVarChar(36), value: 'uuid-x' }]);
    });
    it('publicId로 조회해 행을 반환한다', async () => {
        const row = { id: 7, public_id: 'uuid-x' };
        const { pool } = makeFakePool([[row]]);
        vi.mocked(getPool).mockResolvedValue(pool);
        expect(await getReportByPublicId('uuid-x')).toEqual(row);
    });
    it('id로 조회한다', async () => {
        const row = { id: 2 };
        const { pool, log } = makeFakePool([[row]]);
        vi.mocked(getPool).mockResolvedValue(pool);
        expect(await getReportById(2)).toEqual(row);
        expect(log[0].inputs).toEqual([{ name: 'id', type: sql.Int, value: 2 }]);
    });
});

describe('recordRequest', () => {
    it('user 요청을 analysis_requests에 기록하고 파라미터가 바르게 바인딩된다', async () => {
        const { pool, log } = makeFakePool([[]]);
        vi.mocked(getPool).mockResolvedValue(pool);
        await recordRequest(5, { kind: 'user', userId: 7 }, true);
        expect(log[0].sql).toContain('INSERT INTO analysis_requests');
        expect(log[0].inputs).toEqual([
            { name: 'reportId', type: sql.Int, value: 5 },
            { name: 'actor', type: sql.VarChar(10), value: 'user' },
            { name: 'userId', type: sql.Int, value: 7 },
            { name: 'adminUsername', type: sql.NVarChar(100), value: null },
            { name: 'cacheHit', value: true },
        ]);
    });
    it('admin 요청은 userId가 null, adminUsername이 채워진다', async () => {
        const { pool, log } = makeFakePool([[]]);
        vi.mocked(getPool).mockResolvedValue(pool);
        await recordRequest(1, { kind: 'admin', username: 'root' }, false);
        expect(log[0].inputs).toEqual([
            { name: 'reportId', type: sql.Int, value: 1 },
            { name: 'actor', type: sql.VarChar(10), value: 'admin' },
            { name: 'userId', type: sql.Int, value: null },
            { name: 'adminUsername', type: sql.NVarChar(100), value: 'root' },
            { name: 'cacheHit', value: false },
        ]);
    });
    it('DB 호출이 실패해도 던지지 않고 로그만 남긴다', async () => {
        vi.mocked(getPool).mockRejectedValue(new Error('conn fail'));
        await expect(recordRequest(1, { kind: 'anon' }, false)).resolves.toBeUndefined();
    });
});

describe('countGenerationsToday', () => {
    it('anon은 DB를 조회하지 않고 0을 반환한다', async () => {
        const result = await countGenerationsToday({ kind: 'anon' });
        expect(result).toBe(0);
        expect(getPool).not.toHaveBeenCalled();
    });
    it('user는 userId로 조회하고 c 값을 반환한다', async () => {
        const { pool, log } = makeFakePool([[{ c: 3 }]]);
        vi.mocked(getPool).mockResolvedValue(pool);
        expect(await countGenerationsToday({ kind: 'user', userId: 9 })).toBe(3);
        expect(log[0].inputs).toEqual([{ name: 'userId', type: sql.Int, value: 9 }]);
    });
    it('admin이고 결과가 없으면 0을 반환한다(빈 결과 처리)', async () => {
        const { pool, log } = makeFakePool([[]]);
        vi.mocked(getPool).mockResolvedValue(pool);
        expect(await countGenerationsToday({ kind: 'admin', username: 'root' })).toBe(0);
        expect(log[0].inputs).toEqual([{ name: 'username', type: sql.NVarChar(100), value: 'root' }]);
    });
});

describe('addToLibrary / removeFromLibrary / listLibrary', () => {
    it('addToLibrary는 MERGE에 userId·reportId를 바인딩한다', async () => {
        const { pool, log } = makeFakePool([[]]);
        vi.mocked(getPool).mockResolvedValue(pool);
        await addToLibrary(3, 10);
        expect(log[0].sql).toContain('MERGE analysis_library');
        expect(log[0].inputs).toEqual([
            { name: 'userId', type: sql.Int, value: 3 },
            { name: 'reportId', type: sql.Int, value: 10 },
        ]);
    });
    it('removeFromLibrary는 DELETE에 userId·publicId를 바인딩한다', async () => {
        const { pool, log } = makeFakePool([[]]);
        vi.mocked(getPool).mockResolvedValue(pool);
        await removeFromLibrary(3, 'uuid-y');
        expect(log[0].sql).toContain('DELETE l FROM analysis_library');
        expect(log[0].inputs).toEqual([
            { name: 'userId', type: sql.Int, value: 3 },
            { name: 'publicId', type: sql.NVarChar(36), value: 'uuid-y' },
        ]);
    });
    it('listLibrary는 결과가 없으면 빈 배열을 반환한다', async () => {
        const { pool, log } = makeFakePool([[]]);
        vi.mocked(getPool).mockResolvedValue(pool);
        expect(await listLibrary(3)).toEqual([]);
        expect(log[0].inputs).toEqual([{ name: 'userId', type: sql.Int, value: 3 }]);
    });
    it('listLibrary는 행을 그대로 매핑해 반환한다', async () => {
        const rows = [{ id: 1, public_id: 'p', type: 'job', keyword: 'k', scope: 'kr', created_at: new Date(), request_count: 2 }];
        const { pool } = makeFakePool([rows]);
        vi.mocked(getPool).mockResolvedValue(pool);
        expect(await listLibrary(3)).toEqual(rows);
    });
});

describe('listReports', () => {
    it('필터가 없으면 WHERE 없이 조회하고 빈 결과를 반환한다', async () => {
        const { pool, log } = makeFakePool([[]]);
        vi.mocked(getPool).mockResolvedValue(pool);
        expect(await listReports()).toEqual([]);
        expect(log[0].sql).not.toContain('WHERE r.');
        expect(log[0].inputs).toEqual([]);
    });
    it('type·q 필터가 바인딩되고 LIKE 패턴으로 감싼다', async () => {
        const { pool, log } = makeFakePool([[]]);
        vi.mocked(getPool).mockResolvedValue(pool);
        await listReports({ type: 'job', q: '핀테크' });
        expect(log[0].sql).toContain('WHERE r.type = @type AND r.keyword LIKE @q');
        expect(log[0].inputs).toEqual([
            { name: 'type', type: sql.VarChar(10), value: 'job' },
            { name: 'q', type: sql.NVarChar(52), value: '%핀테크%' },
        ]);
    });
    it('q가 50자를 넘으면 DB를 조회하지 않고 거부한다', async () => {
        await expect(listReports({ q: 'a'.repeat(51) })).rejects.toThrow();
        expect(getPool).not.toHaveBeenCalled();
    });
    it('q가 정확히 50자면 허용한다', async () => {
        const { pool } = makeFakePool([[]]);
        vi.mocked(getPool).mockResolvedValue(pool);
        await expect(listReports({ q: 'a'.repeat(50) })).resolves.toEqual([]);
    });
});

describe('getDashboard', () => {
    it('오늘/최근 7일/캐시 적중률/최근 20건(요청 기준, 캐시 적중 포함)/상위 10개를 반환한다', async () => {
        const requestedAt = new Date('2026-11-10T00:00:00.000Z');
        const recentRows = [{ public_id: 'p1', type: 'job', keyword: '백엔드', actor: 'user', created_at: requestedAt }];
        const { pool, log } = makeFakePool([
            [{ c: 4 }],
            [{ c: 10 }],
            [{ total: 20, hits: 5 }],
            recentRows,
            [{ type: 'job', keyword: '백엔드', cnt: 3 }],
            [{ type: 'industry', keyword: '핀테크', cnt: 2 }],
        ]);
        vi.mocked(getPool).mockResolvedValue(pool);
        const stats = await getDashboard();
        expect(stats.today).toBe(4);
        expect(stats.last7d).toBe(10);
        expect(stats.cacheHitRate).toBeCloseTo(0.25);
        expect(stats.recent).toEqual([{ publicId: 'p1', type: 'job', keyword: '백엔드', actor: 'user', requestedAt }]);
        expect(stats.topJobs).toEqual([{ type: 'job', keyword: '백엔드', cnt: 3 }]);
        expect(stats.topIndustries).toEqual([{ type: 'industry', keyword: '핀테크', cnt: 2 }]);
        // 최근 분석은 analysis_requests(요청 시각) 기준으로 조인한다 — report 생성 시각이 아니다.
        expect(log[3].sql).toContain('FROM analysis_requests q JOIN analysis_reports r');
        expect(log[3].sql).toContain('ORDER BY q.created_at DESC');
        // IP는 selecting하지 않는다.
        expect(log[3].sql).not.toMatch(/\bip\b/i);
    });
    it('요청이 전혀 없으면(빈 결과) 캐시 적중률 0, 최근 분석 빈 배열을 반환한다', async () => {
        const { pool } = makeFakePool([
            [{ c: 0 }], [{ c: 0 }], [{ total: 0, hits: 0 }], [], [], [],
        ]);
        vi.mocked(getPool).mockResolvedValue(pool);
        const stats = await getDashboard();
        expect(stats.cacheHitRate).toBe(0);
        expect(stats.recent).toEqual([]);
        expect(stats.topJobs).toEqual([]);
        expect(stats.topIndustries).toEqual([]);
    });
});
