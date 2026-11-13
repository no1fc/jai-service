import { beforeEach, describe, expect, it, vi } from 'vitest';
import sql, { type ConnectionPool } from 'mssql';

vi.mock('@/lib/db', () => ({ getPool: vi.fn() }));
import { getPool } from '@/lib/db';
import { GET_JOB_ITEMS_SQL, PUT_JOB_ITEMS_SQL, getCachedJobItems, putCachedJobItems } from './items-store';

// DB 의존 함수는 단위 테스트 대신, 실제 실행되는 SQL 문자열에 핵심 조건이 포함되는지만 확인한다(users.test.ts 방식).
describe('GET_JOB_ITEMS_SQL / PUT_JOB_ITEMS_SQL', () => {
    it('GET은 job_norm으로 조회한다', () => {
        expect(GET_JOB_ITEMS_SQL).toContain('career_job_items');
        expect(GET_JOB_ITEMS_SQL).toContain('@jobNorm');
    });

    it('PUT은 MERGE와 @jobNorm을 포함한다', () => {
        expect(PUT_JOB_ITEMS_SQL).toContain('MERGE career_job_items');
        expect(PUT_JOB_ITEMS_SQL).toContain('@jobNorm');
    });
});

// ---- getPool()을 흉내내는 테스트용 가짜 커넥션 풀 -----------------------------------------
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

const validItems = [
    { id: 'job_1', competency: 'communication', text: '맞춤 문항 텍스트를 20자 이상으로 길게 채운다' },
    { id: 'job_2', competency: 'problemSolving', text: '맞춤 문항 텍스트를 20자 이상으로 길게 채운다' },
    { id: 'job_3', competency: 'teamwork', text: '맞춤 문항 텍스트를 20자 이상으로 길게 채운다' },
    { id: 'job_4', competency: 'jobKnowledge', text: '맞춤 문항 텍스트를 20자 이상으로 길게 채운다' },
];

beforeEach(() => {
    vi.mocked(getPool).mockReset();
});

describe('getCachedJobItems', () => {
    it('캐시 행이 없으면 null을 반환한다', async () => {
        const { pool, log } = makeFakePool([[]]);
        vi.mocked(getPool).mockResolvedValue(pool);
        expect(await getCachedJobItems('웹 개발')).toBeNull();
        expect(log[0].inputs).toEqual([{ name: 'jobNorm', type: sql.NVarChar(100), value: '웹 개발' }]);
    });

    it('캐시된 JSON이 유효하면 items를 반환한다', async () => {
        const { pool } = makeFakePool([[{ items: JSON.stringify(validItems) }]]);
        vi.mocked(getPool).mockResolvedValue(pool);
        expect(await getCachedJobItems('웹 개발')).toEqual(validItems);
    });

    it('캐시된 JSON이 스키마에 맞지 않으면 null(미스 처리)을 반환한다', async () => {
        const { pool } = makeFakePool([[{ items: JSON.stringify([{ id: 'bad' }]) }]]);
        vi.mocked(getPool).mockResolvedValue(pool);
        expect(await getCachedJobItems('웹 개발')).toBeNull();
    });

    it('캐시된 값이 JSON 파싱조차 안 되면 null을 반환한다', async () => {
        const { pool } = makeFakePool([[{ items: '{broken' }]]);
        vi.mocked(getPool).mockResolvedValue(pool);
        expect(await getCachedJobItems('웹 개발')).toBeNull();
    });
});

describe('putCachedJobItems', () => {
    it('jobNorm과 items JSON을 바인딩해 MERGE를 실행한다', async () => {
        const { pool, log } = makeFakePool([[]]);
        vi.mocked(getPool).mockResolvedValue(pool);
        await putCachedJobItems('웹 개발', validItems);
        expect(log[0].sql).toContain('MERGE career_job_items');
        expect(log[0].inputs).toEqual([
            { name: 'jobNorm', type: sql.NVarChar(100), value: '웹 개발' },
            { name: 'items', type: sql.NVarChar(2000), value: JSON.stringify(validItems) },
        ]);
    });
});
