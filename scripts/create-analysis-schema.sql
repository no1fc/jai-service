-- AI 직무/산업 분석 서비스 테이블 (02). 앱은 이 테이블을 자동 생성하지 않는다.
-- 실행: sqlcmd -S <서버> -d <DB> -i scripts/create-analysis-schema.sql (또는 SSMS / mssql MCP)

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'analysis_reports')
BEGIN
    CREATE TABLE analysis_reports (
        id INT IDENTITY(1,1) PRIMARY KEY,
        public_id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        type VARCHAR(10) NOT NULL,
        keyword NVARCHAR(50) NOT NULL,
        keyword_norm NVARCHAR(50) NOT NULL,
        scope VARCHAR(10) NOT NULL,
        include_competitors BIT NOT NULL,
        include_trends BIT NOT NULL,
        cache_key CHAR(64) NOT NULL,
        content NVARCHAR(MAX) NOT NULL,
        meta NVARCHAR(MAX) NOT NULL,
        model_name NVARCHAR(100) NOT NULL,
        input_tokens INT NOT NULL DEFAULT 0,
        output_tokens INT NOT NULL DEFAULT 0,
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        expires_at DATETIME2 NOT NULL
    );
    CREATE UNIQUE INDEX UX_analysis_reports_public_id ON analysis_reports (public_id);
    CREATE INDEX IX_analysis_reports_cache ON analysis_reports (cache_key, expires_at DESC);
    CREATE INDEX IX_analysis_reports_created_at ON analysis_reports (created_at DESC);
END;

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'app_users')
BEGIN
    CREATE TABLE app_users (
        id INT IDENTITY(1,1) PRIMARY KEY,
        provider VARCHAR(10) NOT NULL,
        provider_id VARCHAR(100) NOT NULL,
        email NVARCHAR(255) NULL,
        consent_at DATETIME2 NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        last_login_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_app_users_provider UNIQUE (provider, provider_id)
    );
END;

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'analysis_requests')
BEGIN
    CREATE TABLE analysis_requests (
        id INT IDENTITY(1,1) PRIMARY KEY,
        report_id INT NOT NULL FOREIGN KEY REFERENCES analysis_reports(id),
        actor VARCHAR(10) NOT NULL,
        user_id INT NULL,
        admin_username NVARCHAR(100) NULL,
        cache_hit BIT NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
    CREATE INDEX IX_analysis_requests_created_at ON analysis_requests (created_at DESC);
    CREATE INDEX IX_analysis_requests_user ON analysis_requests (user_id, created_at DESC);
    CREATE INDEX IX_analysis_requests_admin ON analysis_requests (admin_username, created_at DESC);
END;

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'analysis_library')
BEGIN
    CREATE TABLE analysis_library (
        user_id INT NOT NULL FOREIGN KEY REFERENCES app_users(id) ON DELETE CASCADE,
        report_id INT NOT NULL FOREIGN KEY REFERENCES analysis_reports(id),
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_analysis_library PRIMARY KEY (user_id, report_id)
    );
END;

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'phone_verifications')
BEGIN
    CREATE TABLE phone_verifications (
        id INT IDENTITY(1,1) PRIMARY KEY,
        phone VARCHAR(20) NOT NULL,
        code_hash CHAR(64) NOT NULL,
        attempts TINYINT NOT NULL DEFAULT 0,
        expires_at DATETIME2 NOT NULL,
        verified_at DATETIME2 NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
    CREATE INDEX IX_phone_verifications_phone ON phone_verifications (phone, created_at DESC);
END;
GO
