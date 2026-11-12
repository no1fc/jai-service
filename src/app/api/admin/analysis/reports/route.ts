/** GET/POST /api/admin/analysis/reports - 상담사용 리포트 보관함 조회·신규 생성(강제 재생성 포함) */
import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { apiError, apiSuccess } from '@/lib/api-response';
import { getClientIp } from '@/lib/rate-limit';
import { formatZodError } from '@/lib/validations';
import { ANALYSIS_TYPES, analysisRequestSchema } from '@/lib/analysis/schema';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const listQuerySchema = z.object({
    type: z.enum(ANALYSIS_TYPES).optional(),
    q: z.string().trim().max(50, '검색어는 50자 이내로 입력해 주세요.').optional(),
});

const createSchema = analysisRequestSchema.extend({ force: z.boolean().default(false) });

export async function GET(request: NextRequest) {
    try {
        const { requireRole } = await import('@/lib/auth');
        const auth = await requireRole('admin');
        if (auth instanceof Response) return auth;

        const params = request.nextUrl.searchParams;
        const parsed = listQuerySchema.safeParse({
            type: params.get('type') ?? undefined,
            q: params.get('q') ?? undefined,
        });
        if (!parsed.success) return apiError(formatZodError(parsed.error), 400);

        const { listReports } = await import('@/lib/analysis/reports');
        const reports = await listReports(parsed.data);
        return apiSuccess({ reports });
    } catch (error) {
        logger.error('/api/admin/analysis/reports GET 오류:', error);
        return apiError('목록 조회에 실패했습니다.');
    }
}

export async function POST(request: NextRequest) {
    try {
        const { requireRole } = await import('@/lib/auth');
        const auth = await requireRole('admin');
        if (auth instanceof Response) return auth;

        let body: unknown;
        try { body = await request.json(); } catch { return apiError('잘못된 요청입니다.', 400); }
        const parsed = createSchema.safeParse(body);
        if (!parsed.success) return apiError(formatZodError(parsed.error), 400);

        const { force, ...req } = parsed.data;
        const { generateAnalysis } = await import('@/lib/analysis/generate');
        const result = await generateAnalysis(req, { kind: 'admin', username: auth.id }, getClientIp(request), { force });
        if (!result.ok) {
            const res = apiError(result.error, result.status);
            if (result.retryAfterSec !== undefined) res.headers.set('Retry-After', String(result.retryAfterSec));
            return res;
        }

        // generateAnalysis의 공개 응답(PublicReport)에는 내부 id가 없으므로 publicId로 다시 조회한다
        // (generate.ts의 공개 계약은 바꾸지 않는다 — 공개 /api/analysis/reports와 공용).
        const { getReportByPublicId } = await import('@/lib/analysis/reports');
        const row = await getReportByPublicId(result.report.publicId);
        if (!row) {
            logger.error('/api/admin/analysis/reports POST - 생성 직후 리포트를 찾지 못함:', result.report.publicId);
            return apiError('리포트 생성에 실패했습니다.', 500);
        }

        return apiSuccess({ report: result.report, cached: result.cached, id: row.id }, undefined, result.cached ? 200 : 201);
    } catch (error) {
        logger.error('/api/admin/analysis/reports POST 오류:', error);
        return apiError('리포트 생성에 실패했습니다.', 500);
    }
}
