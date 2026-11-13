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

/** 자체(이메일/비밀번호) 계정 — app_users를 그대로 쓰되 password_hash 등 잠금 관련 컬럼을 포함한다. */
export interface LocalUser extends AppUser {
    password_hash: string | null;
    failed_attempts: number;
    locked_until: Date | null;
    must_change_password: boolean;
    password_updated_at: Date | null;
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
    // rowsAffected는 배치 문장 순서대로 쌓인다([UPDATE, DELETE]). NOCOUNT ON이면 비므로 마지막 값(DELETE)을 본다.
    return (result.rowsAffected.at(-1) ?? 0) > 0;
}

// --- 자체(이메일/비밀번호) 계정 -------------------------------------------------------------
// 별도 테이블을 두지 않고 app_users를 그대로 쓴다: provider='local', provider_id=정규화 이메일,
// email=같은 값. UNIQUE (provider, provider_id) 제약이 이메일 중복 가입을 막는다(설계서 3.1절).

/** MSSQL 고유 제약조건 위반 오류 번호(2627: UNIQUE/PK 제약, 2601: UNIQUE 인덱스) — 중복 가입 판정에 쓴다. */
export function isUniqueViolation(err: unknown): boolean {
    const number = (err as { number?: number } | undefined)?.number;
    return number === 2627 || number === 2601;
}

export const CREATE_LOCAL_USER_SQL = `
    INSERT INTO app_users (provider, provider_id, email, password_hash, consent_at)
    OUTPUT INSERTED.id
    VALUES ('local', @email, @email, @passwordHash, SYSUTCDATETIME());
`;

/** 자체 계정 가입. 이메일 중복(UNIQUE 위반)이면 'duplicate'를 반환한다(예외로 흘리지 않음). */
export async function createLocalUser(email: string, passwordHash: string): Promise<{ id: number } | 'duplicate'> {
    const pool = await getPool();
    try {
        const r = await pool.request()
            .input('email', sql.VarChar(100), email)
            .input('passwordHash', sql.VarChar(100), passwordHash)
            .query(CREATE_LOCAL_USER_SQL);
        return { id: r.recordset[0].id };
    } catch (err) {
        if (isUniqueViolation(err)) return 'duplicate';
        throw err;
    }
}

export const FIND_LOCAL_USER_BY_EMAIL_SQL = `SELECT * FROM app_users WHERE provider = 'local' AND provider_id = @email`;

export async function findLocalUserByEmail(email: string): Promise<LocalUser | null> {
    const pool = await getPool();
    const r = await pool.request().input('email', sql.VarChar(100), email).query(FIND_LOCAL_USER_BY_EMAIL_SQL);
    return (r.recordset[0] as LocalUser | undefined) ?? null;
}

export const RECORD_LOGIN_FAILURE_SQL = `UPDATE app_users SET failed_attempts = @failedAttempts, locked_until = @lockedUntil WHERE id = @id`;

/** 로그인 실패 — {@link nextFailureState}가 계산한 값을 그대로 저장한다. */
export async function recordLoginFailure(id: number, failedAttempts: number, lockedUntil: Date | null): Promise<void> {
    const pool = await getPool();
    await pool.request()
        .input('id', sql.Int, id)
        .input('failedAttempts', sql.TinyInt, failedAttempts)
        .input('lockedUntil', sql.DateTime2, lockedUntil)
        .query(RECORD_LOGIN_FAILURE_SQL);
}

export const RECORD_LOGIN_SUCCESS_SQL = `UPDATE app_users SET failed_attempts = 0, locked_until = NULL, last_login_at = SYSUTCDATETIME() WHERE id = @id`;

/** 로그인 성공 — 실패 카운트·잠금을 초기화하고 last_login_at을 갱신한다. */
export async function recordLoginSuccess(id: number): Promise<void> {
    const pool = await getPool();
    await pool.request().input('id', sql.Int, id).query(RECORD_LOGIN_SUCCESS_SQL);
}

export const UPDATE_PASSWORD_SQL = `
    UPDATE app_users SET password_hash = @passwordHash, must_change_password = @mustChange,
        password_updated_at = SYSUTCDATETIME(), failed_attempts = 0, locked_until = NULL
    WHERE id = @id`;

/** 비밀번호 변경(본인) 또는 관리자 초기화(mustChange=true) — 잠금 상태도 함께 초기화한다. */
export async function updatePassword(id: number, passwordHash: string, mustChange: boolean): Promise<void> {
    const pool = await getPool();
    await pool.request()
        .input('id', sql.Int, id)
        .input('passwordHash', sql.VarChar(100), passwordHash)
        .input('mustChange', sql.Bit, mustChange)
        .query(UPDATE_PASSWORD_SQL);
}
