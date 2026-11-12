/**
 * POST /api/ask - 국취 24시 Q&A 봇
 */
import { type NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-response';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { askAnswerSchema, askRequestSchema, formatZodError } from '@/lib/validations';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    const limit = checkRateLimit(`ask:${getClientIp(request)}`, { maxRequests: 20, windowMs: 10 * 60 * 1000 });
    if (!limit.allowed) return apiError('질문이 너무 많습니다. 잠시 후 다시 시도해 주세요.', 429);

    let body: unknown;
    try { body = await request.json(); } catch { return apiError('잘못된 요청입니다.', 400); }
    const parsed = askRequestSchema.safeParse(body);
    if (!parsed.success) return apiError(formatZodError(parsed.error), 400);

    try {
        const { getQnaKnowledge } = await import('@/lib/qna/knowledge');
        const { buildAskPrompt } = await import('@/lib/qna/prompt');
        const { generateResponse, safeParseJSON } = await import('@/lib/gemini');
        const { logApiUsage } = await import('@/lib/db');

        const prompt = buildAskPrompt(await getQnaKnowledge(), parsed.data.messages);
        const ai = await generateResponse(prompt, '마지막 사용자 질문에 답해 주세요.');
        const answer = askAnswerSchema.safeParse(safeParseJSON(ai.text));
        await logApiUsage(ai.modelName, ai.usageMetadata?.promptTokenCount || 0,
            ai.usageMetadata?.candidatesTokenCount || 0, ai.usageMetadata?.totalTokenCount || 0, 'qna');
        if (!answer.success) return apiError('답변을 만들지 못했습니다. 다시 질문하시거나 가까운 잡모아 지점으로 문의해 주세요.', 502);
        return apiSuccess(answer.data);
    } catch (error) {
        logger.error('/api/ask 오류:', error);
        return apiError('AI 상담 연결에 실패했습니다. 잠시 후 다시 시도하거나 가까운 잡모아 지점으로 문의해 주세요.', 503);
    }
}
