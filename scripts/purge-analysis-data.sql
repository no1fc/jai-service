-- 분석 서비스 개인정보 파기. 매일 03:10 cron/SQL Agent 등록 (purge-expired-leads.sql과 별도 실행).
-- 캐시된 리포트(analysis_reports)는 삭제하지 않는다 — 링크로 계속 조회할 수 있어야 한다.
DELETE FROM phone_verifications WHERE created_at < DATEADD(day, -1, SYSUTCDATETIME());
-- 1년 미이용 계정 파기. analysis_requests엔 FK가 없어 CASCADE가 안 되므로 먼저 user_id를 NULL로
-- 분리해 이용 기록은 남기고, app_users를 삭제한다(analysis_library는 ON DELETE CASCADE).
UPDATE analysis_requests SET user_id = NULL
    WHERE user_id IN (SELECT id FROM app_users WHERE last_login_at < DATEADD(year, -1, SYSUTCDATETIME()));
DELETE FROM app_users WHERE last_login_at < DATEADD(year, -1, SYSUTCDATETIME());
