/**
 * 유사 직무 추천 AI 폴백 캐시(analysis_suggestions) 데이터 접근 — 서버 전용.
 * 30일 경과분 삭제는 scripts/purge-analysis-data.sql이 담당하며, 이 모듈은 읽기/쓰기만 한다.
 * 파라미터 바인딩 필수(SQL Injection 방지). getPool()을 재사용한다.
 */
import sql from 'mssql';
import { getPool } from '@/lib/db';
import { suggestionsArraySchema } from './suggest-ai';

export const GET_SUGGESTIONS_SQL = 'SELECT suggestions FROM analysis_suggestions WHERE keyword_norm = @keywordNorm';

export const PUT_SUGGESTIONS_SQL = `MERGE analysis_suggestions AS target
    USING (SELECT @keywordNorm AS keyword_norm) AS source
    ON target.keyword_norm = source.keyword_norm
    WHEN MATCHED THEN
        UPDATE SET suggestions = @suggestions
    WHEN NOT MATCHED THEN
        INSERT (keyword_norm, suggestions) VALUES (source.keyword_norm, @suggestions);`;

/**
 * 캐시된 추천 목록을 읽는다. 행이 없거나 JSON 파싱·스키마 검증에 실패하면 캐시 미스(null)로 취급한다.
 */
export async function getCachedSuggestions(keywordNorm: string): Promise<string[] | null> {
    const pool = await getPool();
    const r = await pool.request().input('keywordNorm', sql.NVarChar(50), keywordNorm).query(GET_SUGGESTIONS_SQL);
    const row = r.recordset[0] as { suggestions: string } | undefined;
    if (!row) return null;

    let parsed: unknown;
    try {
        parsed = JSON.parse(row.suggestions);
    } catch {
        return null;
    }
    const result = suggestionsArraySchema.safeParse(parsed);
    return result.success ? result.data : null;
}

/** 추천 목록을 캐시에 저장(있으면 갱신)한다. */
export async function putCachedSuggestions(keywordNorm: string, suggestions: string[]): Promise<void> {
    const pool = await getPool();
    await pool.request()
        .input('keywordNorm', sql.NVarChar(50), keywordNorm)
        .input('suggestions', sql.NVarChar(600), JSON.stringify(suggestions))
        .query(PUT_SUGGESTIONS_SQL);
}
