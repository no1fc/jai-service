-- 분석 서비스 개인정보 파기. 매일 03:10 cron/SQL Agent 등록 (purge-expired-leads.sql과 별도 실행).
DELETE FROM phone_verifications WHERE created_at < DATEADD(day, -1, SYSUTCDATETIME());
-- 1년 미이용 계정 파기. analysis_library는 ON DELETE CASCADE.
DELETE FROM app_users WHERE last_login_at < DATEADD(year, -1, SYSUTCDATETIME());
