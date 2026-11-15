-- scripts/alter-app-users-local.sql  (로컬·운영 각각 사용자가 실행)
IF COL_LENGTH('app_users', 'password_hash') IS NULL
BEGIN
    ALTER TABLE app_users ADD
        password_hash VARCHAR(100) NULL,
        failed_attempts TINYINT NOT NULL CONSTRAINT DF_app_users_failed DEFAULT 0,
        locked_until DATETIME2 NULL,
        must_change_password BIT NOT NULL CONSTRAINT DF_app_users_mcp DEFAULT 0,
        password_updated_at DATETIME2 NULL;
END;
GO
-- 휴대폰 인증 제거(D-7). analysis_requests엔 app_users로의 FK가 없어 CASCADE로 정리되지 않으므로
-- DELETE_USER_SQL(users.ts)과 같은 방침으로 삭제 전에 참조를 먼저 끊는다.
UPDATE analysis_requests SET user_id = NULL WHERE user_id IN (SELECT id FROM app_users WHERE provider = 'phone');
DELETE FROM app_users WHERE provider = 'phone';
DROP TABLE IF EXISTS phone_verifications;
DELETE FROM system_settings WHERE [key] IN ('sens_access_key', 'sens_secret_key', 'sens_service_id', 'sens_sender');
GO
