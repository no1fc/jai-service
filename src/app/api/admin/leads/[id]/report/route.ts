import { type NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-response';
import { buildCounselorReportPrompt, counselorReportSchema } from '@/lib/report/prompt';
import { logger } from '@/lib/logger';
import { getClientIp } from '@/lib/rate-limit';
import { logAdminAccess } from '@/lib/access-log';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    try {
        const { requireRole } = await import('@/lib/auth');
        const auth = await requireRole('admin');
        if (auth instanceof Response) return auth;

        const id = Number((await ctx.params).id);
        if (!Number.isInteger(id) || id < 1) return apiError('잘못된 ID입니다.', 400);

        const { getLeadById, saveLeadReport } = await import('@/lib/leads');
        const lead = await getLeadById(id);
        if (!lead) return apiError('신청 건을 찾을 수 없습니다.', 404);

        await logAdminAccess({ adminUsername: auth.id, action: 'lead.report', targetType: 'lead', targetId: id, ip: getClientIp(req) });

        const refresh = req.nextUrl.searchParams.get('refresh') === '1';
        if (lead.report && !refresh) {
            // 캐시된 리포트가 손상된 JSON이면 무시하고 재생성 경로로 진행한다.
            try {
                const cached = counselorReportSchema.safeParse(JSON.parse(lead.report));
                if (cached.success) return apiSuccess({ report: cached.data });
            } catch {
                // fallthrough: 재생성
            }
        }

        const { generateResponse, safeParseJSON } = await import('@/lib/gemini');
        const { logApiUsage } = await import('@/lib/db');
        const ai = await generateResponse(buildCounselorReportPrompt(lead), '상담 준비 리포트를 작성해 주세요.', true);
        await logApiUsage(ai.modelName, ai.usageMetadata?.promptTokenCount || 0,
            ai.usageMetadata?.candidatesTokenCount || 0, ai.usageMetadata?.totalTokenCount || 0, 'report');
        const report = counselorReportSchema.safeParse(safeParseJSON(ai.text));
        if (!report.success) return apiError('리포트 형식이 올바르지 않습니다. 다시 생성해 주세요.', 502);

        await saveLeadReport(id, JSON.stringify(report.data));
        return apiSuccess({ report: report.data });
    } catch (error) {
        logger.error('리포트 생성 실패:', error);
        return apiError('리포트 생성에 실패했습니다.');
    }
}
