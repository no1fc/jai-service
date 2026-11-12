import { beforeEach, describe, expect, it, vi } from 'vitest';
import sql, { type ConnectionPool } from 'mssql';

vi.mock('@/lib/db', () => ({ getPool: vi.fn() }));
import { getPool } from '@/lib/db';
import {
    deleteVerification,
    incrementAttempts,
    insertVerificationIfAllowed,
    latestVerification,
    markVerified,
} from './phone-store';

// DB 의존 함수는 users.test.ts와 같은 방식으로, 실행되는 SQL·바인딩·OUTPUT/rowsAffected 분기만 검증한다.
interface BoundInput { name: string; type?: unknown; value: unknown }
interface RequestLog { inputs: BoundInput[]; sql: string }

function makeFakePool(resultsQueue: { recordset?: unknown[]; rowsAffected?: number[] }[] = []) {
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
                const result = resultsQueue[idx] ?? {};
                const recordset = result.recordset ?? [];
                return { recordset, rowsAffected: result.rowsAffected ?? [recordset.length] };
            },
        };
        return req;
    };
    return { pool: { request } as unknown as ConnectionPool, log };
}

beforeEach(() => {
    vi.mocked(getPool).mockReset();
});

describe('insertVerificationIfAllowed', () => {
    it('조건을 통과하면 INSERT...SELECT...WHERE NOT EXISTS/COUNT 단일 문장으로 바인딩해 id를 반환한다', async () => {
        const { pool, log } = makeFakePool([{ recordset: [{ id: 11 }] }]);
        vi.mocked(getPool).mockResolvedValue(pool);
        const todayStart = new Date('2026-11-11T15:00:00Z');

        const result = await insertVerificationIfAllowed('01012345678', 'hash', 180, 60, 5, todayStart);

        expect(result).toEqual({ id: 11 });
        expect(log[0].sql).toContain('INSERT INTO phone_verifications');
        expect(log[0].sql).toContain('WHERE NOT EXISTS');
        expect(log[0].sql).toContain('COUNT(*)');
        expect(log[0].sql).not.toContain('CAST(created_at AS DATE)'); // 인덱스를 막는 CAST 금지(요구사항 5)
        // READ COMMITTED에서 두 서브쿼리 모두 UPDLOCK+HOLDLOCK 없이는 phantom-read 레이스가 가능하므로 둘 다 걸려야 한다.
        expect(log[0].sql.match(/WITH \(UPDLOCK, HOLDLOCK\)/g)).toHaveLength(2);
        expect(log[0].inputs).toEqual([
            { name: 'phone', type: sql.VarChar(20), value: '01012345678' },
            { name: 'codeHash', type: sql.VarChar(64), value: 'hash' },
            { name: 'ttlSec', type: sql.Int, value: 180 },
            { name: 'resendIntervalSec', type: sql.Int, value: 60 },
            { name: 'dailyMax', type: sql.Int, value: 5 },
            { name: 'todayStartUtc', type: sql.DateTime, value: todayStart },
        ]);
    });

    it('재발송 간격/일일 한도 조건에 걸려 삽입되지 않으면 null을 반환한다', async () => {
        const { pool } = makeFakePool([{ recordset: [] }]);
        vi.mocked(getPool).mockResolvedValue(pool);

        const result = await insertVerificationIfAllowed('01012345678', 'hash', 180, 60, 5, new Date());

        expect(result).toBeNull();
    });
});

describe('deleteVerification', () => {
    it('id로 DELETE를 바인딩해 실행한다', async () => {
        const { pool, log } = makeFakePool([{ recordset: [] }]);
        vi.mocked(getPool).mockResolvedValue(pool);

        await deleteVerification(11);

        expect(log[0].sql).toContain('DELETE FROM phone_verifications');
        expect(log[0].inputs).toEqual([{ name: 'id', type: sql.Int, value: 11 }]);
    });
});

describe('latestVerification', () => {
    it('결과가 없으면 null을 반환한다', async () => {
        const { pool, log } = makeFakePool([{ recordset: [] }]);
        vi.mocked(getPool).mockResolvedValue(pool);

        expect(await latestVerification('01012345678')).toBeNull();
        expect(log[0].inputs).toEqual([{ name: 'phone', type: sql.VarChar(20), value: '01012345678' }]);
    });

    it('가장 최근 행(ORDER BY created_at DESC)을 그대로 반환한다', async () => {
        const row = { id: 1, code_hash: 'h', attempts: 0, expires_at: new Date(), verified_at: null };
        const { pool, log } = makeFakePool([{ recordset: [row] }]);
        vi.mocked(getPool).mockResolvedValue(pool);

        expect(await latestVerification('01012345678')).toEqual(row);
        expect(log[0].sql).toContain('ORDER BY created_at DESC');
    });
});

describe('incrementAttempts', () => {
    it('OUTPUT INSERTED.attempts로 증가된 값을 원자적으로 반환하고, maxAttempts를 바인딩해 상한을 건다', async () => {
        const { pool, log } = makeFakePool([{ recordset: [{ attempts: 3 }] }]);
        vi.mocked(getPool).mockResolvedValue(pool);

        expect(await incrementAttempts(7, 5)).toBe(3);
        expect(log[0].sql).toContain('OUTPUT INSERTED.attempts');
        expect(log[0].sql).toContain('verified_at IS NULL');
        expect(log[0].sql).toContain('attempts < @maxAttempts'); // TINYINT 오버플로 방지(요구사항 2)
        expect(log[0].inputs).toEqual([
            { name: 'id', type: sql.Int, value: 7 },
            { name: 'maxAttempts', type: sql.Int, value: 5 },
        ]);
    });

    it('이미 사용됐거나 존재하지 않는 id면 null을 반환한다(비교 자체를 막아야 함)', async () => {
        const { pool } = makeFakePool([{ recordset: [] }]);
        vi.mocked(getPool).mockResolvedValue(pool);

        expect(await incrementAttempts(7, 5)).toBeNull();
    });

    it('이미 상한(attempts >= maxAttempts)에 도달한 행은 WHERE에 걸려 더 증가시키지 않고 null을 반환한다', async () => {
        // 실제 상한 판정은 DB의 WHERE attempts < @maxAttempts가 수행한다(페이크 풀은 쿼리를 해석하지 않으므로
        // "조건 불일치 → 빈 recordset" 결과만 흉내낸다) — 호출부는 이 경우도 null로 똑같이 받아 통일된 거부로 처리한다.
        const { pool } = makeFakePool([{ recordset: [] }]);
        vi.mocked(getPool).mockResolvedValue(pool);

        expect(await incrementAttempts(7, 5)).toBeNull();
    });
});

describe('markVerified', () => {
    it('rowsAffected가 1이면 true(이번 호출로 실제 갱신됨)', async () => {
        const { pool, log } = makeFakePool([{ rowsAffected: [1] }]);
        vi.mocked(getPool).mockResolvedValue(pool);

        expect(await markVerified(7)).toBe(true);
        expect(log[0].sql).toContain('verified_at IS NULL');
    });

    it('이미 사용된 행이라 rowsAffected가 0이면 false(동시 요청 중 하나만 true)', async () => {
        const { pool } = makeFakePool([{ rowsAffected: [0] }]);
        vi.mocked(getPool).mockResolvedValue(pool);

        expect(await markVerified(7)).toBe(false);
    });
});
