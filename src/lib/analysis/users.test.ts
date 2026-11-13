import { beforeEach, describe, expect, it, vi } from 'vitest';
import sql, { type ConnectionPool } from 'mssql';

vi.mock('@/lib/db', () => ({ getPool: vi.fn() }));
import { getPool } from '@/lib/db';
import {
    CREATE_LOCAL_USER_SQL,
    FIND_LOCAL_USER_BY_EMAIL_SQL,
    GET_USER_BY_ID_SQL,
    RECORD_LOGIN_FAILURE_SQL,
    RECORD_LOGIN_SUCCESS_SQL,
    UPDATE_PASSWORD_SQL,
    UPSERT_USER_SQL,
    createLocalUser,
    deleteUser,
    findLocalUserByEmail,
    getUserById,
    isUniqueViolation,
    recordLoginFailure,
    recordLoginSuccess,
    updatePassword,
    upsertUser,
} from './users';

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
        const row = { id: 1, provider: 'kakao', provider_id: '1', email: null, must_change_password: false };
        const { pool } = makeFakePool([[row]]);
        vi.mocked(getPool).mockResolvedValue(pool);
        expect(await getUserById(1)).toEqual(row);
    });
    it('GET_USER_BY_ID_SQL은 password_hash·failed_attempts·locked_until을 노출하지 않는다(SELECT * 금지)', () => {
        expect(GET_USER_BY_ID_SQL).not.toContain('*');
        expect(GET_USER_BY_ID_SQL).not.toContain('password_hash');
        expect(GET_USER_BY_ID_SQL).not.toContain('failed_attempts');
        expect(GET_USER_BY_ID_SQL).not.toContain('locked_until');
        expect(GET_USER_BY_ID_SQL).toContain('must_change_password');
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

// ---- 자체(이메일/비밀번호) 계정 ---------------------------------------------------------

describe('로컬 계정 SQL 상수', () => {
    it("CREATE_LOCAL_USER_SQL은 'local'·@email·password_updated_at을 포함한다", () => {
        expect(CREATE_LOCAL_USER_SQL).toContain("'local'");
        expect(CREATE_LOCAL_USER_SQL).toContain('@email');
        expect(CREATE_LOCAL_USER_SQL).toContain('password_updated_at');
    });
    it("FIND_LOCAL_USER_BY_EMAIL_SQL은 'local'과 @email을 포함한다", () => {
        expect(FIND_LOCAL_USER_BY_EMAIL_SQL).toContain("'local'");
        expect(FIND_LOCAL_USER_BY_EMAIL_SQL).toContain('@email');
    });
    it('RECORD_LOGIN_FAILURE_SQL은 OUTPUT·CASE로 원자적으로 failed_attempts·locked_until을 계산한다', () => {
        expect(RECORD_LOGIN_FAILURE_SQL).toContain('OUTPUT INSERTED.failed_attempts, INSERTED.locked_until');
        expect(RECORD_LOGIN_FAILURE_SQL).toContain('CASE');
        expect(RECORD_LOGIN_FAILURE_SQL).toContain('failed_attempts');
        expect(RECORD_LOGIN_FAILURE_SQL).toContain('locked_until');
        expect(RECORD_LOGIN_FAILURE_SQL).toContain('@lockThreshold');
        expect(RECORD_LOGIN_FAILURE_SQL).toContain('@lockMinutes');
        // TINYINT 오버플로 클램프
        expect(RECORD_LOGIN_FAILURE_SQL).toContain('255');
    });
    it('RECORD_LOGIN_SUCCESS_SQL은 failed_attempts·locked_until·last_login_at을 초기화한다', () => {
        expect(RECORD_LOGIN_SUCCESS_SQL).toContain('failed_attempts = 0');
        expect(RECORD_LOGIN_SUCCESS_SQL).toContain('locked_until = NULL');
        expect(RECORD_LOGIN_SUCCESS_SQL).toContain('last_login_at = SYSUTCDATETIME()');
    });
    it('UPDATE_PASSWORD_SQL은 password_hash·must_change_password를 포함한다', () => {
        expect(UPDATE_PASSWORD_SQL).toContain('password_hash');
        expect(UPDATE_PASSWORD_SQL).toContain('must_change_password');
    });
});

describe('isUniqueViolation', () => {
    it('2627·2601은 true, 그 외·undefined는 false', () => {
        expect(isUniqueViolation({ number: 2627 })).toBe(true);
        expect(isUniqueViolation({ number: 2601 })).toBe(true);
        expect(isUniqueViolation({ number: 208 })).toBe(false);
        expect(isUniqueViolation(undefined)).toBe(false);
        expect(isUniqueViolation(new Error('x'))).toBe(false);
    });
});

describe('createLocalUser', () => {
    it('성공하면 id를 반환하고 email·passwordHash를 바인딩한다', async () => {
        const { pool, log } = makeFakePool([[{ id: 5 }]]);
        vi.mocked(getPool).mockResolvedValue(pool);
        const result = await createLocalUser('a@b.com', 'HASH');
        expect(result).toEqual({ id: 5 });
        expect(log[0].inputs).toEqual([
            { name: 'email', type: sql.VarChar(100), value: 'a@b.com' },
            { name: 'passwordHash', type: sql.VarChar(100), value: 'HASH' },
        ]);
    });
    it('이메일을 trim·소문자로 정규화해서 바인딩한다(호출 측이 빠뜨려도 저장소에서 막음)', async () => {
        const { pool, log } = makeFakePool([[{ id: 6 }]]);
        vi.mocked(getPool).mockResolvedValue(pool);
        await createLocalUser('  Foo@BAR.com  ', 'HASH');
        expect(log[0].inputs.find(i => i.name === 'email')).toEqual({ name: 'email', type: sql.VarChar(100), value: 'foo@bar.com' });
    });
    it('UNIQUE 위반(2627)이면 duplicate를 반환한다', async () => {
        const pool = {
            request: () => ({
                input() { return this; },
                async query() {
                    const err = new Error('dup') as Error & { number: number };
                    err.number = 2627;
                    throw err;
                },
            }),
        } as unknown as ConnectionPool;
        vi.mocked(getPool).mockResolvedValue(pool);
        expect(await createLocalUser('a@b.com', 'HASH')).toBe('duplicate');
    });
    it('UNIQUE 위반이 아닌 오류는 그대로 던진다', async () => {
        const pool = {
            request: () => ({
                input() { return this; },
                async query() {
                    throw new Error('기타 오류');
                },
            }),
        } as unknown as ConnectionPool;
        vi.mocked(getPool).mockResolvedValue(pool);
        await expect(createLocalUser('a@b.com', 'HASH')).rejects.toThrow('기타 오류');
    });
});

describe('findLocalUserByEmail', () => {
    it('행이 있으면 그대로 반환한다', async () => {
        const row = { id: 1, provider: 'local', provider_id: 'a@b.com', email: 'a@b.com', password_hash: 'H' };
        const { pool } = makeFakePool([[row]]);
        vi.mocked(getPool).mockResolvedValue(pool);
        expect(await findLocalUserByEmail('a@b.com')).toEqual(row);
    });
    it('없으면 null', async () => {
        const { pool } = makeFakePool([[]]);
        vi.mocked(getPool).mockResolvedValue(pool);
        expect(await findLocalUserByEmail('x@y.com')).toBeNull();
    });
    it('이메일을 trim·소문자로 정규화해서 바인딩한다', async () => {
        const { pool, log } = makeFakePool([[]]);
        vi.mocked(getPool).mockResolvedValue(pool);
        await findLocalUserByEmail('  Foo@BAR.com  ');
        expect(log[0].inputs).toEqual([{ name: 'email', type: sql.VarChar(100), value: 'foo@bar.com' }]);
    });
});

describe('recordLoginFailure', () => {
    it('id·lockThreshold·lockMinutes를 바인딩하고 OUTPUT으로 받은 값을 그대로 반환한다', async () => {
        const lockedUntil = new Date('2026-01-01T00:15:00Z');
        const { pool, log } = makeFakePool([[{ failed_attempts: 5, locked_until: lockedUntil }]]);
        vi.mocked(getPool).mockResolvedValue(pool);
        const result = await recordLoginFailure(1);
        expect(result).toEqual({ failedAttempts: 5, lockedUntil });
        expect(log[0].inputs).toEqual([
            { name: 'id', type: sql.Int, value: 1 },
            { name: 'lockThreshold', type: sql.Int, value: 5 },
            { name: 'lockMinutes', type: sql.Int, value: 15 },
        ]);
    });
    it('잠기지 않은 상태의 결과(locked_until=null)도 그대로 전달한다', async () => {
        const { pool } = makeFakePool([[{ failed_attempts: 2, locked_until: null }]]);
        vi.mocked(getPool).mockResolvedValue(pool);
        expect(await recordLoginFailure(1)).toEqual({ failedAttempts: 2, lockedUntil: null });
    });
    it('대상 행이 없으면(id 불일치 등) 명확한 에러를 던진다', async () => {
        const { pool } = makeFakePool([[]]);
        vi.mocked(getPool).mockResolvedValue(pool);
        await expect(recordLoginFailure(999)).rejects.toThrow(/찾을 수 없습니다/);
    });
});

describe('recordLoginSuccess', () => {
    it('id만 바인딩한다', async () => {
        const { pool, log } = makeFakePool([[]]);
        vi.mocked(getPool).mockResolvedValue(pool);
        await recordLoginSuccess(1);
        expect(log[0].inputs).toEqual([{ name: 'id', type: sql.Int, value: 1 }]);
    });
});

describe('updatePassword', () => {
    it('id·passwordHash·mustChange를 바인딩한다', async () => {
        const { pool, log } = makeFakePool([[]]);
        vi.mocked(getPool).mockResolvedValue(pool);
        await updatePassword(1, 'HASH', true);
        expect(log[0].inputs).toEqual([
            { name: 'id', type: sql.Int, value: 1 },
            { name: 'passwordHash', type: sql.VarChar(100), value: 'HASH' },
            { name: 'mustChange', type: sql.Bit, value: true },
        ]);
    });
});
