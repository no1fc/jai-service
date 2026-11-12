-- 상담 신청(leads) 1년 경과분 및 관리자 접속기록 2년 경과분 자동 파기
-- 개인정보 보호법 제21조(leads), 제29조 안전성 확보조치 기준(admin_access_logs).
-- 앱이 트래픽이 있을 때(insertLead/getLeads 호출 시) 24시간마다 자동 실행하지만,
-- 트래픽이 없는 날을 대비해 서버 cron 또는 SQL Server Agent 작업으로 매일 03:00 등록할 것.
-- (SQL Server Agent 또는 sqlcmd -S <서버> -d <DB> -i scripts/purge-expired-leads.sql)

DELETE FROM leads WHERE created_at < DATEADD(year, -1, SYSUTCDATETIME());

DELETE FROM admin_access_logs WHERE created_at < DATEADD(year, -2, SYSUTCDATETIME());
