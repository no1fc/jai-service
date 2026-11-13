/** POST /api/analysis/reports - 직무/산업 분석 리포트 생성(캐시 적중 시 재사용) */
import { type NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-response';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { formatZodError } from '@/lib/validations';
import { analysisRequestSchema } from '@/lib/analysis/schema';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    const ip = getClientIp(request);
    const burst = checkRateLimit(`analysis:post:${ip}`, { maxRequests: 10, windowMs: 60 * 1000 });
    if (!burst.allowed) return apiError('요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.', 429);

    let body: unknown;
    try { body = await request.json(); } catch { return apiError('잘못된 요청입니다.', 400); }
    const parsed = analysisRequestSchema.safeParse(body);
    if (!parsed.success) return apiError(formatZodError(parsed.error), 400);

    try {
        const { actorFromRequest } = await import('@/lib/analysis/auth/user-session');
        const { generateAnalysis } = await import('@/lib/analysis/generate');
        const result = await generateAnalysis(parsed.data, await actorFromRequest(), ip);
        if (!result.ok) {
            const res = apiError(result.error, result.status);
            if (result.retryAfterSec !== undefined) res.headers.set('Retry-After', String(result.retryAfterSec));
            return res;
        }
        return apiSuccess({ report: result.report, cached: result.cached }, undefined, result.cached ? 200 : 201);
    } catch (error) {
        logger.error('/api/analysis/reports 오류:', error);
        return apiError('리포트 생성에 실패했습니다.', 500);
    }
}
