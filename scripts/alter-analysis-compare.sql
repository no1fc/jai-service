-- 비교 리포트(Task 17, 설계서 5.4) — analysis_reports.keyword/keyword_norm 길이 확장 + kind 컬럼 추가.
-- 실행 전 확인(이 저장소 기준 결과: 두 컬럼 모두 인덱스/제약 없음 — 바로 ALTER 가능):
--   SELECT i.name, c.name FROM sys.indexes i
--   JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
--   JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
--   WHERE i.object_id = OBJECT_ID('analysis_reports') AND c.name IN ('keyword','keyword_norm');
-- 위 조회에서 인덱스가 나오면 ALTER 전에 DROP INDEX, ALTER 후 CREATE INDEX로 재생성할 것.
-- 실행: sqlcmd -S localhost,1433 -U <user> -P <password> -d jobmoa_ness_chat -C -i scripts/alter-analysis-compare.sql

ALTER TABLE analysis_reports ALTER COLUMN keyword NVARCHAR(160) NOT NULL;
ALTER TABLE analysis_reports ALTER COLUMN keyword_norm NVARCHAR(160) NOT NULL;
IF COL_LENGTH('analysis_reports', 'kind') IS NULL
    ALTER TABLE analysis_reports ADD kind VARCHAR(10) NOT NULL CONSTRAINT DF_analysis_reports_kind DEFAULT 'single';
GO
