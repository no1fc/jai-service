import { beforeEach, describe, expect, it, vi } from 'vitest';
import sql, { type ConnectionPool } from 'mssql';

vi.mock('@/lib/db', () => ({ getPool: vi.fn() }));
import { getPool } from '@/lib/db';
import { UPSERT_USER_SQL, deleteUser, getUserById, upsertUser } from './users';

// DB 의존 함수는 단위 테스트 대신, 실제 실행되는 SQL 문자열에 핵심 조건이 포함되는지만 확인한다(reports.test.ts 방식).
describe('UPSERT_USER_SQL', () => {
    it('MERGE app_users와 last_login_at 갱신을 포함한다', () => {
        expect(UPSERT_USER_SQL).toContain('MERGE app_users');
        expect(UPSERT_USER_SQL).toContain('last_login_at = SYSUTCDATETIME()');
    });
});

// ---- getPool()을 흉내내는 테스트용 가짜 커넥션 풀 -----------------------------------------
interface BoundInput { name: string; type?: unknown; value: unknown }
interface RequestLog { inputs: BoundInput[]; sql: string }

function makeFakePool(resultsQueue: unknown[][] = [], rowsAffectedQueue: number[][] = []) {
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
                const rowsAffected = rowsAffectedQueue[idx] ?? [recordset.length];
                return { recordset, rowsAffected };
            },
        };
        return req;
    };
    return { pool: { request } as unknown as ConnectionPool, log };
}

beforeEach(() => {
    vi.mocked(getPool).mockReset();
});

describe('upsertUser', () => {
    it('provider·providerId·email을 바인딩하고 MERGE 결과 id를 반환한다', async () => {
        const { pool, log } = makeFakePool([[{ id: 9 }]]);
        vi.mocked(getPool).mockResolvedValue(pool);
        const result = await upsertUser({ provider: 'kakao', providerId: '123', email: 'a@b.com', consent: true });
        expect(result).toEqual({ id: 9 });
        expect(log[0].sql).toContain('MERGE app_users');
        expect(log[0].inputs).toEqual([
            { name: 'provider', type: sql.VarChar(10), value: 'kakao' },
            { name: 'providerId', type: sql.VarChar(100), value: '123' },
            { name: 'email', type: sql.NVarChar(255), value: 'a@b.com' },
        ]);
    });
    it('email이 없으면 null로 바인딩한다', async () => {
        const { pool, log } = makeFakePool([[{ id: 1 }]]);
        vi.mocked(getPool).mockResolvedValue(pool);
        await upsertUser({ provider: 'kakao', providerId: '1', consent: true });
        expect(log[0].inputs.find(i => i.name === 'email')).toEqual({ name: 'email', type: sql.NVarChar(255), value: null });
    });
});

describe('getUserById', () => {
    it('결과가 없으면 null을 반환한다', async () => {
        const { pool, log } = makeFakePool([[]]);
        vi.mocked(getPool).mockResolvedValue(pool);
        expect(await getUserById(1)).toBeNull();
        expect(log[0].inputs).toEqual([{ name: 'id', type: sql.Int, value: 1 }]);
    });
    it('행이 있으면 그대로 반환한다', async () => {
        const row = { id: 1, provider: 'kakao', provider_id: '1', email: null };
        const { pool } = makeFakePool([[row]]);
        vi.mocked(getPool).mockResolvedValue(pool);
        expect(await getUserById(1)).toEqual(row);
    });
});

describe('deleteUser', () => {
    it('analysis_requests.user_id를 먼저 NULL로 분리한 뒤 app_users를 삭제한다(한 배치)', async () => {
        const { pool, log } = makeFakePool([[]], [[1, 1]]);
        vi.mocked(getPool).mockResolvedValue(pool);
        expect(await deleteUser(1)).toBe(true);
        const sql = log[0].sql;
        expect(sql).toContain('UPDATE analysis_requests SET user_id = NULL WHERE user_id = @id');
        expect(sql).toContain('DELETE FROM app_users WHERE id = @id');
        expect(sql.indexOf('UPDATE analysis_requests')).toBeLessThan(sql.indexOf('DELETE FROM app_users'));
    });
    it('app_users 삭제 행이 없으면 false를 반환한다', async () => {
        const { pool } = makeFakePool([[]], [[0, 0]]);
        vi.mocked(getPool).mockResolvedValue(pool);
        expect(await deleteUser(2)).toBe(false);
    });
});
