import { beforeEach, describe, expect, it, vi } from 'vitest';
import sql, { type ConnectionPool } from 'mssql';

vi.mock('@/lib/db', () => ({ getPool: vi.fn() }));
import { getPool } from '@/lib/db';
import { GET_SUGGESTIONS_SQL, PUT_SUGGESTIONS_SQL, getCachedSuggestions, putCachedSuggestions } from './suggest-store';

// DB 의존 함수는 단위 테스트 대신, 실제 실행되는 SQL 문자열에 핵심 조건이 포함되는지만 확인한다(items-store.test.ts 방식).
describe('GET_SUGGESTIONS_SQL / PUT_SUGGESTIONS_SQL', () => {
    it('GET은 keyword_norm으로 조회한다', () => {
        expect(GET_SUGGESTIONS_SQL).toContain('analysis_suggestions');
        expect(GET_SUGGESTIONS_SQL).toContain('@keywordNorm');
    });

    it('PUT은 MERGE와 @keywordNorm을 포함한다', () => {
        expect(PUT_SUGGESTIONS_SQL).toContain('MERGE analysis_suggestions');
        expect(PUT_SUGGESTIONS_SQL).toContain('@keywordNorm');
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

const suggestions = ['프로덕트 매니저', '그로스 PM'];

beforeEach(() => {
    vi.mocked(getPool).mockReset();
});

describe('getCachedSuggestions', () => {
    it('캐시 행이 없으면 null을 반환한다', async () => {
        const { pool, log } = makeFakePool([[]]);
        vi.mocked(getPool).mockResolvedValue(pool);
        expect(await getCachedSuggestions('핀테크 pm')).toBeNull();
        expect(log[0].inputs).toEqual([{ name: 'keywordNorm', type: sql.NVarChar(50), value: '핀테크 pm' }]);
    });

    it('캐시된 JSON이 유효하면 추천 배열을 반환한다', async () => {
        const { pool } = makeFakePool([[{ suggestions: JSON.stringify(suggestions) }]]);
        vi.mocked(getPool).mockResolvedValue(pool);
        expect(await getCachedSuggestions('핀테크 pm')).toEqual(suggestions);
    });

    it('캐시된 JSON이 스키마에 맞지 않으면(7개 이상) null(미스 처리)을 반환한다', async () => {
        const bad = Array.from({ length: 7 }, (_, i) => `직무${i}`);
        const { pool } = makeFakePool([[{ suggestions: JSON.stringify(bad) }]]);
        vi.mocked(getPool).mockResolvedValue(pool);
        expect(await getCachedSuggestions('핀테크 pm')).toBeNull();
    });

    it('캐시된 값이 JSON 파싱조차 안 되면 null을 반환한다', async () => {
        const { pool } = makeFakePool([[{ suggestions: '{broken' }]]);
        vi.mocked(getPool).mockResolvedValue(pool);
        expect(await getCachedSuggestions('핀테크 pm')).toBeNull();
    });
});

describe('putCachedSuggestions', () => {
    it('keywordNorm과 suggestions JSON을 바인딩해 MERGE를 실행한다', async () => {
        const { pool, log } = makeFakePool([[]]);
        vi.mocked(getPool).mockResolvedValue(pool);
        await putCachedSuggestions('핀테크 pm', suggestions);
        expect(log[0].sql).toContain('MERGE analysis_suggestions');
        expect(log[0].inputs).toEqual([
            { name: 'keywordNorm', type: sql.NVarChar(50), value: '핀테크 pm' },
            { name: 'suggestions', type: sql.NVarChar(600), value: JSON.stringify(suggestions) },
        ]);
    });
});
