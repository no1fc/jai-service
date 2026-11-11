-- NESS Chatbot MSSQL Schema
-- MSSQL 스키마 생성 스크립트 (앱 initSchema와 동일 구조)

-- 1. 지점 정보 테이블
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'branches')
BEGIN
    CREATE TABLE branches (
        id INT IDENTITY(1,1) PRIMARY KEY,
        region_sido NVARCHAR(50) NOT NULL,
        region_sigungu NVARCHAR(50) NOT NULL,
        branch_name NVARCHAR(100) NOT NULL,
        address NVARCHAR(255) NOT NULL,
        phone NVARCHAR(50) NOT NULL,
        specific_url NVARCHAR(500) NOT NULL,
        latitude FLOAT NULL,
        longitude FLOAT NULL,
        covered_regions NVARCHAR(MAX) DEFAULT '[]',
        created_at DATETIME DEFAULT GETDATE()
    );

    CREATE INDEX idx_region ON branches(region_sido, region_sigungu);
END;

-- 2. 관리자 계정 테이블
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'admin_users')
BEGIN
    CREATE TABLE admin_users (
        id INT IDENTITY(1,1) PRIMARY KEY,
        username NVARCHAR(100) NOT NULL UNIQUE,
        password_hash NVARCHAR(255) NOT NULL,
        role NVARCHAR(50) DEFAULT 'admin',
        created_at DATETIME DEFAULT GETDATE()
    );
END;

-- 3. 시스템 설정 테이블 (key는 MSSQL 예약어이므로 대괄호 사용)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'system_settings')
BEGIN
    CREATE TABLE system_settings (
        [key] NVARCHAR(255) PRIMARY KEY,
        value NVARCHAR(MAX) NOT NULL,
        updated_at DATETIME DEFAULT GETDATE()
    );
END;

-- 4. API 사용량 로그 테이블
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'api_usage_logs')
BEGIN
    CREATE TABLE api_usage_logs (
        id INT IDENTITY(1,1) PRIMARY KEY,
        model_name NVARCHAR(100) NOT NULL,
        input_tokens INT DEFAULT 0,
        output_tokens INT DEFAULT 0,
        total_tokens INT DEFAULT 0,
        result_type NVARCHAR(100) NULL,
        created_at DATETIME DEFAULT GETDATE()
    );
END;

-- 5. 상담 신청(리드) 테이블
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'leads')
BEGIN
    CREATE TABLE leads (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(50) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        region NVARCHAR(50) NOT NULL,
        desired_job NVARCHAR(100) NOT NULL DEFAULT '',
        source VARCHAR(20) NOT NULL,
        payload NVARCHAR(MAX) NOT NULL,
        consent_at DATETIME2 NOT NULL,
        report NVARCHAR(MAX) NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'new',
        created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME()
    );
    CREATE INDEX IX_leads_created_at ON leads (created_at DESC);
END;
GO
