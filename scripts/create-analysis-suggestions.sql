-- 유사 직무 추천 2단계(AI 폴백, flash-lite) 캐시 테이블 (Task 21, D-9 2단계).
-- 캐시는 30일 보관 — scripts/purge-analysis-data.sql이 경과분을 삭제한다.
-- 실행: sqlcmd -S <서버> -d <DB> -i scripts/create-analysis-suggestions.sql

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'analysis_suggestions')
    CREATE TABLE analysis_suggestions (
        keyword_norm NVARCHAR(50) NOT NULL PRIMARY KEY,
        suggestions NVARCHAR(600) NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
GO
