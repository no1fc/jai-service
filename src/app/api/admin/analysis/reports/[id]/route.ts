/** GET /api/admin/analysis/reports/[id] - 상담사용 리포트 단건 조회(요청 이력 요약 포함) */
import { type NextRequest } from 'next/server';
import sql from 'mssql';
import { z } from 'zod';
import { apiError, apiSuccess } from '@/lib/api-response';
import { getPool } from '@/lib/db';
import { logger } from '@/lib/logger';
import type { TokenPayload } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

const idSchema = z.coerce.number().int().positive();

async function authAndId(ctx: Ctx): Promise<{ error: Response } | { id: number; auth: TokenPayload }> {
    const { requireRole } = await import('@/lib/auth');
    const auth = await requireRole('admin');
    if (auth instanceof Response) return { error: auth };
    const parsed = idSchema.safeParse((await ctx.params).id);
    if (!parsed.success) return { error: apiError('잘못된 ID입니다.', 400) };
    return { id: parsed.data, auth: auth as TokenPayload };
}

interface RequestSummary { count: number; lastRequestedAt: string | null }

/** 리포트 1건의 요청 이력 요약(요청 수·최근 요청 시각). */
async function getRequestSummary(reportId: number): Promise<RequestSummary> {
    const pool = await getPool();
    const r = await pool.request().input('reportId', sql.Int, reportId)
        .query('SELECT COUNT(*) AS c, MAX(created_at) AS last FROM analysis_requests WHERE report_id = @reportId');
    const row = r.recordset[0] as { c: number; last: Date | null } | undefined;
    return { count: row?.c ?? 0, lastRequestedAt: row?.last ? new Date(row.last).toISOString() : null };
}

export async function GET(_req: NextRequest, ctx: Ctx) {
    try {
        const r = await authAndId(ctx);
        if ('error' in r) return r.error;

        const { getReportById, toPublicReport } = await import('@/lib/analysis/reports');
        const row = await getReportById(r.id);
        if (!row) return apiError('리포트를 찾을 수 없습니다.', 404);

        const requestSummary = await getRequestSummary(r.id);
        return apiSuccess({
            report: toPublicReport(row),
            id: row.id,
            // "같은 조건으로 재생성" 버튼이 쓸 원본 옵션(PublicReport에는 없음)
            includeCompetitors: row.include_competitors,
            includeTrends: row.include_trends,
            requestSummary,
        });
    } catch (error) {
        logger.error('/api/admin/analysis/reports/[id] 오류:', error);
        return apiError('리포트 조회에 실패했습니다.', 500);
    }
}
