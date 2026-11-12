/**
 * 상담 신청(leads) 데이터 접근 — 서버 전용
 */
import sql from 'mssql';
import { getPool } from '@/lib/db';
import type { LeadInput } from '@/lib/validations';
import type { Lead, LeadStatus } from '@/types/lead';

export async function insertLead(input: LeadInput): Promise<number> {
    const pool = await getPool();
    const r = await pool.request()
        .input('name', sql.NVarChar(50), input.name)
        .input('phone', sql.VarChar(20), input.phone)
        .input('region', sql.NVarChar(50), input.region)
        .input('desired_job', sql.NVarChar(100), input.desiredJob)
        .input('source', sql.VarChar(20), input.source)
        .input('payload', sql.NVarChar(sql.MAX), JSON.stringify(input.payload))
        // mssql 드라이버는 DATETIME2를 UTC로 해석하므로, 저장도 UTC(SYSUTCDATETIME)로 맞춘다.
        // created_at의 DDL 기본값도 SYSUTCDATETIME()이지만, 변경 이전에 만들어진 DB에는
        // 과거 기본값(로컬 시간)이 남아있을 수 있어 여기서 명시적으로 넘겨 UTC를 보장한다.
        .query(`INSERT INTO leads (name, phone, region, desired_job, source, payload, consent_at, created_at)
                OUTPUT INSERTED.id VALUES (@name, @phone, @region, @desired_job, @source, @payload, SYSUTCDATETIME(), SYSUTCDATETIME())`);
    return r.recordset[0].id as number;
}

// ponytail: 최근 500건 고정 조회. 리드가 늘면 페이지네이션 추가
export async function getLeads(status?: LeadStatus): Promise<Lead[]> {
    const pool = await getPool();
    const req = pool.request();
    let where = '';
    if (status) {
        req.input('status', sql.VarChar(20), status);
        where = 'WHERE status = @status';
    }
    const r = await req.query(`SELECT TOP 500 * FROM leads ${where} ORDER BY created_at DESC`);
    return r.recordset as Lead[];
}

export async function getLeadById(id: number): Promise<Lead | null> {
    const pool = await getPool();
    const r = await pool.request().input('id', sql.Int, id).query('SELECT * FROM leads WHERE id = @id');
    return (r.recordset[0] as Lead) ?? null;
}

export async function updateLeadStatus(id: number, status: LeadStatus): Promise<boolean> {
    const pool = await getPool();
    const r = await pool.request().input('id', sql.Int, id).input('status', sql.VarChar(20), status)
        .query('UPDATE leads SET status = @status WHERE id = @id');
    return r.rowsAffected[0] > 0;
}

export async function saveLeadReport(id: number, report: string): Promise<boolean> {
    const pool = await getPool();
    const r = await pool.request().input('id', sql.Int, id).input('report', sql.NVarChar(sql.MAX), report)
        .query('UPDATE leads SET report = @report WHERE id = @id');
    return r.rowsAffected[0] > 0;
}
