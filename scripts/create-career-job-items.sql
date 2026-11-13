IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'career_job_items')
BEGIN
    CREATE TABLE career_job_items (
        job_norm NVARCHAR(100) NOT NULL PRIMARY KEY,
        items NVARCHAR(2000) NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END;
GO
