/**
 * POST /api/career - AI 1분 자기소개서 + 역량 진단
 */
import { type NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-response';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { formatZodError } from '@/lib/validations';
import { careerRequestSchema, careerResultSchema } from '@/lib/career/schema';
import { buildCareerPrompt } from '@/lib/career/prompt';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    const limit = checkRateLimit(`career:${getClientIp(request)}`, { maxRequests: 5, windowMs: 10 * 60 * 1000 });
    if (!limit.allowed) return apiError('요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.', 429);

    let body: unknown;
    try { body = await request.json(); } catch { return apiError('잘못된 요청입니다.', 400); }
    const parsed = careerRequestSchema.safeParse(body);
    if (!parsed.success) return apiError(formatZodError(parsed.error), 400);

    try {
        const { generateResponse, safeParseJSON } = await import('@/lib/gemini');
        const { logApiUsage } = await import('@/lib/db');
        const prompt = buildCareerPrompt(parsed.data);

        // JSON 형식이 깨지면 1회 재시도
        for (let attempt = 0; attempt < 2; attempt++) {
            const ai = await generateResponse(prompt, '자기소개서와 역량 진단을 작성해 주세요.', true);
            await logApiUsage(ai.modelName, ai.usageMetadata?.promptTokenCount || 0,
                ai.usageMetadata?.candidatesTokenCount || 0, ai.usageMetadata?.totalTokenCount || 0, 'career');
            const result = careerResultSchema.safeParse(safeParseJSON(ai.text));
            if (result.success) return apiSuccess({ result: result.data });
        }
        return apiError('결과를 만들지 못했습니다. 다시 시도하시거나 가까운 잡모아 지점으로 문의해 주세요.', 502);
    } catch (error) {
        logger.error('/api/career 오류:', error);
        return apiError('AI 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.', 503);
    }
}
