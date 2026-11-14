/**
 * GET /api/analysis/suggest?type=job&q= — 입력 중 유사 직무 추천(AI 호출 없음, 설계서 6장 B-3).
 * 기존 리포트(keyword_norm 접두 일치) + 정적 시드만 사용한다. type=industry는 빈 배열.
 */
import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { apiError, apiSuccess } from '@/lib/api-response';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { ANALYSIS_TYPES, KEYWORD_MAX, KEYWORD_MIN } from '@/lib/analysis/schema';
import { JOB_SEEDS } from '@/lib/analysis/job-seeds';
import { mergeSuggestions } from '@/lib/analysis/suggest';

export const dynamic = 'force-dynamic';

const KEYWORD_RE = /^[\p{Script=Hangul}\p{Script=Latin}0-9 /+#.&()-]+$/u;
const querySchema = z.object({
    type: z.enum(ANALYSIS_TYPES),
    q: z.string().trim().min(KEYWORD_MIN).max(KEYWORD_MAX).regex(KEYWORD_RE),
});

export async function GET(request: NextRequest) {
    const ip = getClientIp(request);
    const limit = checkRateLimit(`analysis:suggest:${ip}`, { maxRequests: 60, windowMs: 60 * 1000 });
    if (!limit.allowed) return apiError('요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.', 429);

    const parsed = querySchema.safeParse({
        type: request.nextUrl.searchParams.get('type') ?? undefined,
        q: request.nextUrl.searchParams.get('q') ?? undefined,
    });
    if (!parsed.success) return apiError('잘못된 요청입니다.', 400);
    const { type, q } = parsed.data;

    if (type !== 'job') return apiSuccess({ suggestions: [] });

    try {
        const { findJobReportsByPrefix } = await import('@/lib/analysis/reports');
        const reports = await findJobReportsByPrefix(q);
        return apiSuccess({ suggestions: mergeSuggestions(q, reports, JOB_SEEDS) });
    } catch (error) {
        logger.error('/api/analysis/suggest 오류:', error);
        return apiError('추천을 불러오지 못했습니다.', 500);
    }
}
