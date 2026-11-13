/**
 * POST /api/career - AI 1분 자기소개서 + 역량 진단 (v2)
 */
import { type NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-response';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { formatZodError } from '@/lib/validations';
import { careerRequestSchema, careerResultSchema, COMPETENCIES, type CompetencyKey } from '@/lib/career/schema';
import { buildCareerPrompt } from '@/lib/career/prompt';
import { COMMON_ITEMS, scoreCompetencies, levelOf, type CompetencyLevel } from '@/lib/career/items';
import { ALL_PROGRAMS, filterPrograms } from '@/lib/career/programs';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    const limit = checkRateLimit(`career:${getClientIp(request)}`, { maxRequests: 5, windowMs: 10 * 60 * 1000 });
    if (!limit.allowed) return apiError('요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.', 429);

    let body: unknown;
    try { body = await request.json(); } catch { return apiError('잘못된 요청입니다.', 400); }
    const parsed = careerRequestSchema.safeParse(body);
    if (!parsed.success) return apiError(formatZodError(parsed.error), 400);

    // 역량 점수·수준은 서버가 계산한다. 모델이 이를 바꾸지 못하도록 프롬프트에 고정값으로 넣고, 응답도 아래에서 이 값으로 덮어쓴다.
    const items = [...COMMON_ITEMS, ...parsed.data.jobItems];
    const scores = scoreCompetencies(items, parsed.data.itemRatings);
    const levels = Object.fromEntries(
        COMPETENCIES.map(c => [c.key, levelOf(scores[c.key])]),
    ) as Record<CompetencyKey, CompetencyLevel>;

    try {
        const { generateResponse, safeParseJSON } = await import('@/lib/gemini');
        const { logApiUsage } = await import('@/lib/db');
        const prompt = buildCareerPrompt(parsed.data, scores, levels, items);

        // JSON 형식·스키마가 깨지면 1회 재시도
        for (let attempt = 0; attempt < 2; attempt++) {
            const ai = await generateResponse(prompt, '자기소개서와 역량 진단을 작성해 주세요.', true);
            await logApiUsage(ai.modelName, ai.usageMetadata?.promptTokenCount || 0,
                ai.usageMetadata?.candidatesTokenCount || 0, ai.usageMetadata?.totalTokenCount || 0, 'career');
            const parsedResult = careerResultSchema.safeParse(safeParseJSON(ai.text));
            if (parsedResult.success) {
                const result = {
                    ...parsedResult.data,
                    // 전체 추천 프로그램도 역량별 programs와 같은 신뢰 경계: 허용 목록 밖 값은 서버가 제거한다(순서 유지, 중복 제거)
                    recommendedPrograms: Array.from(new Set(parsedResult.data.recommendedPrograms.filter(p => ALL_PROGRAMS.includes(p)))),
                    competencyDetails: parsedResult.data.competencyDetails.map(detail => ({
                        ...detail,
                        score: scores[detail.key],
                        level: levels[detail.key],
                        programs: filterPrograms(detail.key, detail.programs),
                    })),
                };
                return apiSuccess({ result, scores });
            }
        }
        return apiError('결과를 만들지 못했습니다. 다시 시도하시거나 가까운 잡모아 지점으로 문의해 주세요.', 502);
    } catch (error) {
        logger.error('/api/career 오류:', error);
        return apiError('AI 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.', 503);
    }
}
