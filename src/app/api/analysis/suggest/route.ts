/**
 * GET /api/analysis/suggest?type=job&q= — 입력 중 유사 직무 추천(설계서 6장 B-3, D-9).
 * 1단계: 기존 리포트(keyword_norm 접두 일치) + 정적 시드(AI 호출 없음). type=industry는 빈 배열.
 * 2단계(선택): 1단계 결과가 3개 미만이고 관리자 설정 `analysis_suggest_ai`가 'on'이면
 * flash-lite 1회(+30일 캐시)로 보강한다. 기본값(설정 없음)은 꺼짐.
 */
import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { apiError, apiSuccess } from '@/lib/api-response';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { getSetting } from '@/lib/db';
import { logger } from '@/lib/logger';
import { ANALYSIS_TYPES, KEYWORD_MAX, KEYWORD_MIN, KEYWORD_RE } from '@/lib/analysis/schema';
import { JOB_SEEDS } from '@/lib/analysis/job-seeds';
import { mergeSuggestions } from '@/lib/analysis/suggest';
import { normalizeKeyword } from '@/lib/analysis/keywords';
import { findJobReportsByPrefix } from '@/lib/analysis/reports';
import { checkSuggestAiLimit, suggestWithAi } from '@/lib/analysis/suggest-ai';
import { getCachedSuggestions, putCachedSuggestions } from '@/lib/analysis/suggest-store';

/** 1단계 결과가 이 개수 미만일 때만 2단계(AI 폴백)를 시도한다(설계서 6.1절). */
const AI_FALLBACK_THRESHOLD = 3;

export const dynamic = 'force-dynamic';

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
        const reports = await findJobReportsByPrefix(q);
        const stage1 = mergeSuggestions(q, reports, JOB_SEEDS);
        if (stage1.length >= AI_FALLBACK_THRESHOLD) return apiSuccess({ suggestions: stage1 });

        // 캐시 조회/저장·AI 호출 중 발생한 오류(예: 캐시 테이블 없음)는 1단계 결과를 버릴 이유가
        // 아니므로 여기서만 따로 감싸고, 실패 시 AI 결과 없이 1단계 결과만 돌려준다.
        let aiSuggestions: string[] = [];
        try {
            aiSuggestions = await getAiSuggestions(q, ip);
        } catch (aiError) {
            logger.error('/api/analysis/suggest AI 폴백 오류:', aiError);
        }
        return apiSuccess({ suggestions: mergeSuggestions(q, reports, JOB_SEEDS, aiSuggestions) });
    } catch (error) {
        logger.error('/api/analysis/suggest 오류:', error);
        return apiError('추천을 불러오지 못했습니다.', 500);
    }
}

/**
 * 2단계(선택) AI 폴백 — 관리자 설정이 꺼져 있으면 즉시 빈 배열. 캐시 적중이면 AI를 호출하지
 * 않는다. 캐시 미스일 때만 일일 한도(IP 30회·전체 500회)를 확인하고, 통과해야 실제로 호출한다.
 * 캐시 저장 실패는 이미 받은 AI 결과를 버릴 이유가 아니므로 로그만 남긴다.
 */
async function getAiSuggestions(q: string, ip: string): Promise<string[]> {
    if ((await getSetting('analysis_suggest_ai')) !== 'on') return [];

    const keywordNorm = normalizeKeyword(q);
    const useCache = keywordNorm !== '';

    if (useCache) {
        const cached = await getCachedSuggestions(keywordNorm);
        if (cached) return cached;
    }

    if (!checkSuggestAiLimit(ip)) return [];
    const suggestions = await suggestWithAi(q);

    if (useCache && suggestions.length > 0) {
        try {
            await putCachedSuggestions(keywordNorm, suggestions);
        } catch (cacheError) {
            logger.error('/api/analysis/suggest 캐시 저장 실패:', cacheError);
        }
    }
    return suggestions;
}
