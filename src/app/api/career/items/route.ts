/**
 * POST /api/career/items - 희망직무 맞춤 역량 문항 4개 생성(DB 캐시, 캐시 적중 시 AI 미호출)
 */
import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { apiError, apiSuccess } from '@/lib/api-response';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { formatZodError } from '@/lib/validations';
import { jobItemsResponseSchema } from '@/lib/career/schema';
import { buildJobItemsPrompt } from '@/lib/career/prompt';
import { getCachedJobItems, putCachedJobItems } from '@/lib/career/items-store';
import { normalizeKeyword } from '@/lib/analysis/cache-key';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const itemsRequestSchema = z.object({
    desiredJob: z.string().trim().min(1, '희망 직무를 입력해주세요.').max(100),
});

export async function POST(request: NextRequest) {
    const limit = checkRateLimit(`career-items:${getClientIp(request)}`, { maxRequests: 20, windowMs: 10 * 60 * 1000 });
    if (!limit.allowed) return apiError('요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.', 429);

    let body: unknown;
    try { body = await request.json(); } catch { return apiError('잘못된 요청입니다.', 400); }
    const parsed = itemsRequestSchema.safeParse(body);
    if (!parsed.success) return apiError(formatZodError(parsed.error), 400);

    // 정규화 결과가 빈 문자열이면(허용되지 않는 문자만 입력) 서로 다른 입력이 같은 '' PK 행을 공유하게 되므로 캐시를 건너뛴다.
    const jobNorm = normalizeKeyword(parsed.data.desiredJob);
    const useCache = jobNorm !== '';

    try {
        if (useCache) {
            const cached = await getCachedJobItems(jobNorm);
            if (cached) return apiSuccess({ items: cached });
        }

        const { generateResponse, safeParseJSON } = await import('@/lib/gemini');
        const { logApiUsage } = await import('@/lib/db');
        const prompt = buildJobItemsPrompt(parsed.data.desiredJob);
        const ai = await generateResponse(prompt, '맞춤 문항 4개를 만들어 주세요.', true);
        await logApiUsage(ai.modelName, ai.usageMetadata?.promptTokenCount || 0,
            ai.usageMetadata?.candidatesTokenCount || 0, ai.usageMetadata?.totalTokenCount || 0, 'career_items');

        const result = jobItemsResponseSchema.safeParse(safeParseJSON(ai.text));
        if (!result.success) return apiSuccess({ items: [] });

        if (useCache) {
            // 캐시 저장 실패는 이미 검증된 문항을 버릴 이유가 아니므로, 쓰기만 따로 감싸 로그만 남기고 응답은 그대로 돌려준다.
            try {
                await putCachedJobItems(jobNorm, result.data.items);
            } catch (cacheError) {
                logger.error('/api/career/items 캐시 저장 실패:', cacheError);
            }
        }
        return apiSuccess({ items: result.data.items });
    } catch (error) {
        // AI 실패·검증 실패는 재시도하지 않는다 — 클라이언트는 공통 문항만으로 계속 진행한다.
        logger.error('/api/career/items 오류:', error);
        return apiSuccess({ items: [] });
    }
}
