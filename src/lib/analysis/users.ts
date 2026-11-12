/**
 * app_users(참여자) 데이터 접근 — 서버 전용.
 * 카카오 등 외부 로그인으로 유입된 참여자를 provider+providerId 기준으로 upsert한다.
 * 파라미터 바인딩 필수(SQL Injection 방지). getPool()을 재사용한다.
 */
import sql from 'mssql';
import { getPool } from '@/lib/db';

/** app_users 테이블 한 행 */
export interface AppUser {
    id: number;
    provider: string;
    provider_id: string;
    email: string | null;
    consent_at: Date;
    created_at: Date;
    last_login_at: Date;
}

export interface UpsertUserInput {
    provider: string;
    providerId: string;
    email?: string | null;
    consent: true;
}

// 있으면 email·last_login_at만 갱신, 없으면 신규 생성 — consent_at은 최초 동의 시각 그대로 유지한다.
export const UPSERT_USER_SQL = `
    MERGE app_users AS target
    USING (SELECT @provider AS provider, @providerId AS provider_id) AS source
    ON target.provider = source.provider AND target.provider_id = source.provider_id
    WHEN MATCHED THEN
        UPDATE SET email = @email, last_login_at = SYSUTCDATETIME()
    WHEN NOT MATCHED THEN
        INSERT (provider, provider_id, email, consent_at) VALUES (source.provider, source.provider_id, @email, SYSUTCDATETIME())
    OUTPUT INSERTED.id;
`;

/** 참여자 upsert — 있으면 email·last_login_at 갱신, 없으면 신규 생성. */
export async function upsertUser(input: UpsertUserInput): Promise<{ id: number }> {
    const pool = await getPool();
    const r = await pool.request()
        .input('provider', sql.VarChar(10), input.provider)
        .input('providerId', sql.VarChar(100), input.providerId)
        .input('email', sql.NVarChar(255), input.email ?? null)
        .query(UPSERT_USER_SQL);
    return { id: r.recordset[0].id };
}

export async function getUserById(id: number): Promise<AppUser | null> {
    const pool = await getPool();
    const r = await pool.request().input('id', sql.Int, id).query('SELECT * FROM app_users WHERE id = @id');
    return (r.recordset[0] as AppUser | undefined) ?? null;
}

export async function deleteUser(id: number): Promise<boolean> {
    const pool = await getPool();
    const result = await pool.request().input('id', sql.Int, id).query('DELETE FROM app_users WHERE id = @id');
    return (result.rowsAffected[0] ?? 0) > 0;
}
