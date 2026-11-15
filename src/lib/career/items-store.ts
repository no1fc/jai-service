/**
 * 희망직무 맞춤 문항 캐시(career_job_items) 데이터 접근 — 서버 전용.
 * 파라미터 바인딩 필수(SQL Injection 방지). getPool()을 재사용한다.
 */
import sql from 'mssql';
import { getPool } from '@/lib/db';
import { jobItemsResponseSchema, type JobItem } from './schema';

export const GET_JOB_ITEMS_SQL = 'SELECT items FROM career_job_items WHERE job_norm = @jobNorm';

export const PUT_JOB_ITEMS_SQL = `MERGE career_job_items AS target
    USING (SELECT @jobNorm AS job_norm) AS source
    ON target.job_norm = source.job_norm
    WHEN MATCHED THEN
        UPDATE SET items = @items
    WHEN NOT MATCHED THEN
        INSERT (job_norm, items) VALUES (source.job_norm, @items);`;

/**
 * 캐시된 맞춤 문항을 읽는다. 행이 없거나 JSON 파싱·스키마 검증에 실패하면 캐시 미스(null)로 취급한다.
 */
export async function getCachedJobItems(jobNorm: string): Promise<JobItem[] | null> {
    const pool = await getPool();
    const r = await pool.request().input('jobNorm', sql.NVarChar(100), jobNorm).query(GET_JOB_ITEMS_SQL);
    const row = r.recordset[0] as { items: string } | undefined;
    if (!row) return null;

    let parsedItems: unknown;
    try {
        parsedItems = JSON.parse(row.items);
    } catch {
        return null;
    }
    const result = jobItemsResponseSchema.safeParse({ items: parsedItems });
    return result.success ? result.data.items : null;
}

/** 맞춤 문항을 캐시에 저장(있으면 갱신)한다. */
export async function putCachedJobItems(jobNorm: string, items: JobItem[]): Promise<void> {
    const pool = await getPool();
    await pool.request()
        .input('jobNorm', sql.NVarChar(100), jobNorm)
        .input('items', sql.NVarChar(2000), JSON.stringify(items))
        .query(PUT_JOB_ITEMS_SQL);
}
