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

// 탈퇴 시 이용 기록은 남기고 회원 식별만 끊기 위해, app_users 삭제 전에 analysis_requests.user_id를
// 먼저 NULL로 분리한다(이 테이블엔 FK가 없어 CASCADE로 자동 정리되지 않음). analysis_library는
// app_users FK에 ON DELETE CASCADE가 걸려 있어(create-analysis-schema.sql) 자동 삭제된다.
// 한 배치(단일 쿼리 호출)로 보내 왕복을 늘리지 않는다.
export const DELETE_USER_SQL = `
    UPDATE analysis_requests SET user_id = NULL WHERE user_id = @id;
    DELETE FROM app_users WHERE id = @id;
`;

export async function deleteUser(id: number): Promise<boolean> {
    const pool = await getPool();
    const result = await pool.request().input('id', sql.Int, id).query(DELETE_USER_SQL);
    // rowsAffected는 배치 내 각 문장 순서대로 쌍이 쌓인다: [0]=UPDATE, [1]=DELETE.
    return (result.rowsAffected[1] ?? 0) > 0;
}
