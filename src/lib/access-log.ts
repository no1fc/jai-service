/**
 * 관리자의 개인정보 조회·리포트 생성 접속기록 — 서버 전용.
 * 개인정보 보호법 제29조(안전성 확보조치 기준)에 따라 2년간 보관한다(scripts/purge-expired-leads.sql).
 */
import sql from 'mssql';
import { getPool } from '@/lib/db';
import { logger } from '@/lib/logger';

export type AdminAccessAction = 'lead.view' | 'lead.report' | 'lead.status' | 'lead.list';

interface LogAdminAccessInput {
    adminUsername: string;
    action: AdminAccessAction;
    targetType: string;
    targetId?: number | null;
    ip: string;
}

/** 접속기록을 남긴다. 실패해도 요청 흐름을 막지 않고 에러만 로깅한다. */
export async function logAdminAccess(input: LogAdminAccessInput): Promise<void> {
    try {
        const pool = await getPool();
        await pool.request()
            .input('admin_username', sql.NVarChar(100), input.adminUsername)
            .input('action', sql.VarChar(30), input.action)
            .input('target_type', sql.VarChar(30), input.targetType)
            .input('target_id', sql.Int, input.targetId ?? null)
            .input('ip', sql.VarChar(64), input.ip)
            .query(`INSERT INTO admin_access_logs (admin_username, action, target_type, target_id, ip)
                    VALUES (@admin_username, @action, @target_type, @target_id, @ip)`);
    } catch (error) {
        logger.error('[접속기록] 기록 실패:', error);
    }
}
