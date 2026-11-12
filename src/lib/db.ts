/**
 * MSSQL 데이터베이스 초기화 및 쿼리 유틸리티
 * 지점(branches) 테이블 관리 및 지역별 지점 조회 기능 제공.
 * 서버 사이드 전용 (Node.js 환경)
 */

import sql, { type config as MssqlConfig, ConnectionPool, Transaction, Request } from 'mssql';
import { logger } from '@/lib/logger';

// 타입은 @/types/db에서 정의, 여기서 re-export
export type { Branch, AdminUser, SystemSetting, ApiUsageLog } from '@/types/db';
import type { Branch, AdminUser } from '@/types/db';

// MSSQL 연결 설정
const mssqlConfig: MssqlConfig = {
    server: process.env.MSSQL_HOST || 'localhost',
    port: parseInt(process.env.MSSQL_PORT || '1433'),
    user: process.env.MSSQL_USER,
    password: process.env.MSSQL_PASSWORD,
    database: process.env.MSSQL_DATABASE,
    options: {
        encrypt: process.env.MSSQL_ENCRYPT === 'true',
        trustServerCertificate: process.env.MSSQL_TRUST_SERVER_CERTIFICATE !== 'false',
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
    },
};

// 커넥션 풀 싱글톤
let poolPromise: Promise<ConnectionPool> | null = null;
let schemaInitialized = false;

/**
 * MSSQL 커넥션 풀 반환 (최초 호출 시 연결 + 스키마 초기화)
 */
export async function getPool(): Promise<ConnectionPool> {
    if (!poolPromise) {
        poolPromise = sql.connect(mssqlConfig);
    }
    const pool = await poolPromise;

    if (!schemaInitialized) {
        await initSchema(pool);
        schemaInitialized = true;
    }

    return pool;
}

/**
 * 데이터베이스 스키마 초기화 함수
 * 테이블이 없으면 생성, 마이그레이션 처리
 */
async function initSchema(pool: ConnectionPool): Promise<void> {
    // 1. 지점 정보 테이블 생성
    await pool.request().query(`
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
        END
    `);

    // branches 테이블 마이그레이션 (컬럼 추가)
    const branchColumns = await pool.request().query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'branches'
    `);
    const columnNames = branchColumns.recordset.map((r: any) => r.COLUMN_NAME);

    if (!columnNames.includes('latitude')) {
        await pool.request().query('ALTER TABLE branches ADD latitude FLOAT NULL');
        logger.info('[DB Migration] Added latitude to branches table');
    }
    if (!columnNames.includes('longitude')) {
        await pool.request().query('ALTER TABLE branches ADD longitude FLOAT NULL');
        logger.info('[DB Migration] Added longitude to branches table');
    }
    if (!columnNames.includes('covered_regions')) {
        await pool.request().query("ALTER TABLE branches ADD covered_regions NVARCHAR(MAX) DEFAULT '[]'");
        logger.info('[DB Migration] Added covered_regions to branches table');
    }

    // 2. 관리자 계정 테이블 생성
    await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'admin_users')
        BEGIN
            CREATE TABLE admin_users (
                id INT IDENTITY(1,1) PRIMARY KEY,
                username NVARCHAR(100) NOT NULL UNIQUE,
                password_hash NVARCHAR(255) NOT NULL,
                role NVARCHAR(50) DEFAULT 'admin',
                created_at DATETIME DEFAULT GETDATE()
            );
        END
    `);

    // 3. 시스템 설정 테이블 생성
    await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'system_settings')
        BEGIN
            CREATE TABLE system_settings (
                [key] NVARCHAR(255) PRIMARY KEY,
                value NVARCHAR(MAX) NOT NULL,
                updated_at DATETIME DEFAULT GETDATE()
            );
        END
    `);

    // 4. API 사용량 로그 테이블 생성
    await pool.request().query(`
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
        END
    `);

    // 5. 상담 신청(리드) 테이블 생성
    await pool.request().query(`
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
                created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
            );
            CREATE INDEX IX_leads_created_at ON leads (created_at DESC);
        END
    `);
}

// ==========================================
// Branches CRUD
// ==========================================

/**
 * 지역(시/도, 시/군/구)으로 잡모아 지점 조회
 */
export async function getBranchByRegion(sido: string, sigungu: string): Promise<Branch | null> {
    const pool = await getPool();

    // 1차 검색: 물리적 주소(시/도, 시/군/구) 완벽 일치 검색
    const directResult = await pool.request()
        .input('sido', sql.NVarChar(50), sido)
        .input('sigungu', sql.NVarChar(50), sigungu)
        .query(`
            SELECT TOP 1 * FROM branches
            WHERE region_sido = @sido AND region_sigungu = @sigungu
        `);

    if (directResult.recordset.length > 0) {
        return directResult.recordset[0] as Branch;
    }

    // 2차 검색: OPENJSON으로 covered_regions JSON 배열을 SQL 레벨에서 필터링
    const searchTarget = `${sido} ${sigungu}`;
    const coveredResult = await pool.request()
        .input('searchTarget', sql.NVarChar(100), searchTarget)
        .query(`
            SELECT TOP 1 b.* FROM branches b
            CROSS APPLY OPENJSON(b.covered_regions) AS cr
            WHERE cr.value = @searchTarget
        `);

    if (coveredResult.recordset.length > 0) {
        return coveredResult.recordset[0] as Branch;
    }

    return null;
}

/**
 * 전체 지점 목록 조회 (관리자용, 지역순 정렬)
 */
export async function getAllBranches(): Promise<Branch[]> {
    const pool = await getPool();
    const result = await pool.request().query(`
        SELECT * FROM branches ORDER BY region_sido, region_sigungu
    `);
    return result.recordset as Branch[];
}

/**
 * 전체 지점 개수 반환
 */
export async function getBranchCount(): Promise<number> {
    const pool = await getPool();
    const result = await pool.request().query('SELECT COUNT(*) as count FROM branches');
    return result.recordset[0].count;
}

/**
 * 지점 데이터 삽입 함수 (시드 스크립트에서 사용)
 */
export async function insertBranches(branches: Omit<Branch, 'id' | 'created_at'>[]): Promise<void> {
    const pool = await getPool();
    const transaction = new Transaction(pool);
    await transaction.begin();

    try {
        for (const branch of branches) {
            const request = new Request(transaction);
            request.input('region_sido', sql.NVarChar(50), branch.region_sido);
            request.input('region_sigungu', sql.NVarChar(50), branch.region_sigungu);
            request.input('branch_name', sql.NVarChar(100), branch.branch_name);
            request.input('address', sql.NVarChar(255), branch.address);
            request.input('phone', sql.NVarChar(50), branch.phone);
            request.input('specific_url', sql.NVarChar(500), branch.specific_url);
            request.input('latitude', sql.Float, branch.latitude ?? null);
            request.input('longitude', sql.Float, branch.longitude ?? null);
            request.input('covered_regions', sql.NVarChar(sql.MAX), branch.covered_regions ?? '[]');

            // INSERT OR IGNORE 대체: 중복 검사 후 삽입
            await request.query(`
                IF NOT EXISTS (
                    SELECT 1 FROM branches
                    WHERE region_sido = @region_sido AND region_sigungu = @region_sigungu AND branch_name = @branch_name
                )
                INSERT INTO branches (region_sido, region_sigungu, branch_name, address, phone, specific_url, latitude, longitude, covered_regions)
                VALUES (@region_sido, @region_sigungu, @branch_name, @address, @phone, @specific_url, @latitude, @longitude, @covered_regions)
            `);
        }

        await transaction.commit();
        logger.info(`${branches.length}개 지점 데이터 삽입 완료`);
    } catch (err) {
        await transaction.rollback();
        throw err;
    }
}

// branches 테이블 허용 컬럼 화이트리스트 (SQL Injection 방어)
const BRANCH_ALLOWED_COLUMNS = [
    'region_sido', 'region_sigungu', 'branch_name', 'address',
    'phone', 'specific_url', 'latitude', 'longitude', 'covered_regions',
] as const;

/**
 * 지점 정보 수정
 */
export async function updateBranch(id: number, branchData: Partial<Omit<Branch, 'id' | 'created_at'>>): Promise<boolean> {
    // 화이트리스트에 포함된 컬럼만 필터링
    const safeKeys = Object.keys(branchData).filter(
        (key): key is (typeof BRANCH_ALLOWED_COLUMNS)[number] =>
            (BRANCH_ALLOWED_COLUMNS as readonly string[]).includes(key)
    );
    if (safeKeys.length === 0) return false;

    const pool = await getPool();
    const request = pool.request();
    request.input('id', sql.Int, id);

    const setClauses = safeKeys.map((key) => {
        const value = branchData[key];
        request.input(key, sql.NVarChar(sql.MAX), value !== undefined ? String(value) : null);
        return `${key} = @${key}`;
    });

    const result = await request.query(`
        UPDATE branches SET ${setClauses.join(', ')} WHERE id = @id
    `);

    return (result.rowsAffected[0] ?? 0) > 0;
}

/**
 * 지점 삭제
 */
export async function deleteBranch(id: number): Promise<boolean> {
    const pool = await getPool();
    const result = await pool.request()
        .input('id', sql.Int, id)
        .query('DELETE FROM branches WHERE id = @id');
    return (result.rowsAffected[0] ?? 0) > 0;
}

// ==========================================
// Admin Users CRUD
// ==========================================

export async function getAdminByUsername(username: string): Promise<AdminUser | null> {
    const pool = await getPool();
    const result = await pool.request()
        .input('username', sql.NVarChar(100), username)
        .query('SELECT * FROM admin_users WHERE username = @username');
    return result.recordset.length > 0 ? (result.recordset[0] as AdminUser) : null;
}

export async function getAllAdmins(): Promise<AdminUser[]> {
    const pool = await getPool();
    const result = await pool.request().query(
        'SELECT id, username, role, created_at FROM admin_users ORDER BY id DESC'
    );
    return result.recordset as AdminUser[];
}

/**
 * 전체 관리자 개수 반환
 */
export async function getAdminCount(): Promise<number> {
    const pool = await getPool();
    const result = await pool.request().query('SELECT COUNT(*) as count FROM admin_users');
    return result.recordset[0].count;
}

export async function createAdmin(username: string, password_hash: string, role: string = 'admin'): Promise<boolean> {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('username', sql.NVarChar(100), username)
            .input('password_hash', sql.NVarChar(255), password_hash)
            .input('role', sql.NVarChar(50), role)
            .query(`
                INSERT INTO admin_users (username, password_hash, role)
                VALUES (@username, @password_hash, @role)
            `);
        return (result.rowsAffected[0] ?? 0) > 0;
    } catch (error) {
        logger.error('관리자 생성 에러:', error);
        return false;
    }
}

export async function updateAdminPassword(id: number, new_password_hash: string): Promise<boolean> {
    const pool = await getPool();
    const result = await pool.request()
        .input('id', sql.Int, id)
        .input('password_hash', sql.NVarChar(255), new_password_hash)
        .query('UPDATE admin_users SET password_hash = @password_hash WHERE id = @id');
    return (result.rowsAffected[0] ?? 0) > 0;
}

export async function updateAdminRole(id: number, role: string): Promise<boolean> {
    const pool = await getPool();
    const result = await pool.request()
        .input('id', sql.Int, id)
        .input('role', sql.NVarChar(50), role)
        .query('UPDATE admin_users SET role = @role WHERE id = @id');
    return (result.rowsAffected[0] ?? 0) > 0;
}

export async function deleteAdmin(id: number): Promise<boolean> {
    const pool = await getPool();
    const result = await pool.request()
        .input('id', sql.Int, id)
        .query('DELETE FROM admin_users WHERE id = @id');
    return (result.rowsAffected[0] ?? 0) > 0;
}

// ==========================================
// System Settings CRUD
// ==========================================

export async function getSetting(key: string): Promise<string | null> {
    const pool = await getPool();
    const result = await pool.request()
        .input('key', sql.NVarChar(255), key)
        .query('SELECT value FROM system_settings WHERE [key] = @key');
    return result.recordset.length > 0 ? result.recordset[0].value : null;
}

export async function getAllSettings(): Promise<Record<string, string>> {
    const pool = await getPool();
    const result = await pool.request().query('SELECT [key], value FROM system_settings');

    return result.recordset.reduce((acc: Record<string, string>, row: any) => {
        acc[row.key] = row.value;
        return acc;
    }, {});
}

export async function updateSetting(key: string, value: string): Promise<boolean> {
    const pool = await getPool();
    const result = await pool.request()
        .input('key', sql.NVarChar(255), key)
        .input('value', sql.NVarChar(sql.MAX), value)
        .query(`
            MERGE system_settings AS target
            USING (SELECT @key AS [key], @value AS value) AS source
            ON target.[key] = source.[key]
            WHEN MATCHED THEN
                UPDATE SET value = source.value, updated_at = GETDATE()
            WHEN NOT MATCHED THEN
                INSERT ([key], value, updated_at) VALUES (source.[key], source.value, GETDATE());
        `);
    return (result.rowsAffected[0] ?? 0) > 0;
}

// ==========================================
// API Usage Logs
// ==========================================

/**
 * API 호출 결과를 DB에 로깅합니다.
 */
export async function logApiUsage(
    model_name: string,
    input_tokens: number,
    output_tokens: number,
    total_tokens: number,
    result_type: string | null
): Promise<boolean> {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('model_name', sql.NVarChar(100), model_name)
            .input('input_tokens', sql.Int, input_tokens)
            .input('output_tokens', sql.Int, output_tokens)
            .input('total_tokens', sql.Int, total_tokens)
            .input('result_type', sql.NVarChar(100), result_type)
            .query(`
                INSERT INTO api_usage_logs (model_name, input_tokens, output_tokens, total_tokens, result_type)
                VALUES (@model_name, @input_tokens, @output_tokens, @total_tokens, @result_type)
            `);
        return (result.rowsAffected[0] ?? 0) > 0;
    } catch (error) {
        logger.error('API Usage 로깅 에러:', error);
        return false;
    }
}

/**
 * 기간별 / 모델별 통계 집계를 반환합니다.
 */
export async function getApiUsageStats(period: 'day' | 'month' | 'year' = 'day', dateFilter?: string): Promise<any[]> {
    const pool = await getPool();

    let dateFormat = 'yyyy-MM-dd';
    if (period === 'month') dateFormat = 'yyyy-MM';
    if (period === 'year') dateFormat = 'yyyy';

    const request = pool.request();
    request.input('dateFormat', sql.NVarChar(20), dateFormat);

    let condition = '';
    if (dateFilter) {
        request.input('dateFilter', sql.NVarChar(20), `${dateFilter}%`);
        condition = "WHERE FORMAT(created_at, 'yyyy-MM-dd') LIKE @dateFilter";
    }

    const result = await request.query(`
        SELECT
            FORMAT(created_at, @dateFormat) as log_date,
            model_name,
            SUM(input_tokens) as total_input_tokens,
            SUM(output_tokens) as total_output_tokens,
            SUM(total_tokens) as total_tokens_used,
            COUNT(*) as request_count
        FROM api_usage_logs
        ${condition}
        GROUP BY FORMAT(created_at, @dateFormat), model_name
        ORDER BY FORMAT(created_at, @dateFormat) DESC, model_name ASC
    `);

    return result.recordset;
}
