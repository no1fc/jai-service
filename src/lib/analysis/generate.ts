/**
 * 리포트 생성 오케스트레이터 — 서버 전용.
 * 캐시 → 한도 → 고용24(옵션) → [경쟁사 ON] 조사 1회(챗 모델·검색) → 리포트 1회(분석 모델·JSON, 실패 시 1회 재시도) → 저장 → 요청 기록.
 * 조사는 경쟁사 ON일 때만 실행하고, 실패하거나 출처 0건이면 null(학습 지식으로 저하)로 리포트 호출을 계속한다.
 * 긴 리포트 프롬프트에 googleSearch를 붙이면 모델이 검색을 거의 하지 않는 실험 결과(설계서 3.2절)에 따라
 * 호출 1회가 아니라 조사·리포트 2회로 분리하기로 결정했다(Task 3 재스파이크, `fix: 검색 그라운딩 시 JSON 모드 해제` 커밋).
 *
 * generateComparison(비교 리포트, 설계서 5.5)은 같은 흐름을 키워드 여러 개로 확장한 것으로,
 * 호출·재시도·저장·완료 공통 로직(runReport/callResearch/saveReport/finish)을 generateAnalysis와 공유한다.
 */
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { buildCacheKey, buildCompareCacheKey } from './cache-key';
import {
    analysisUserMessage, buildAnalysisPrompt, buildComparePrompt, buildCompareResearchPrompt, buildResearchPrompt,
    compareUserMessage,
} from './prompt';
import {
    invalidKeywordSchema, jobReportSchema, industryReportSchema, compareReportSchema, REPORT_CACHE_TTL_DAYS,
    type AnalysisRequest, type CompareRequest, type PublicReport, type ReportContent, type ReportKind, type ReportMeta, type Work24Summary,
} from './schema';
import { checkDailyLimit } from './limits';
import { fetchWork24Summary } from './work24';
import { addToLibrary, findFreshReport, insertReport, isMissingTableError, recordRequest, toPublicReport, type Actor, type StoredReport } from './reports';

type Ok = { ok: true; report: PublicReport; cached: boolean };
type Fail = { ok: false; status: 400 | 429 | 502 | 503; error: string; retryAfterSec?: number };
const fail = (status: Fail['status'], error: string, retryAfterSec?: number): Fail => ({ ok: false, status, error, retryAfterSec });
type Research = { text: string; sources: ReportMeta['sources']; searchEntryPoint: string | null };
type ReportResult = { ok: true; content: ReportContent; sources: ReportMeta['sources']; searchEntryPoint: string | null; modelName: string; inputTokens: number; outputTokens: number };
type ReportCallResult = { ok: true; content: ReportContent; modelName: string; inputTokens: number; outputTokens: number };

// 리포트 호출에 쓰는 유형별 스키마(invalid 공통) — 응답이 요청 유형과 다른 모양이면 safeParse가 그대로 실패해 재시도로 이어진다.
const jobOrInvalid = z.union([invalidKeywordSchema, jobReportSchema]);
const industryOrInvalid = z.union([invalidKeywordSchema, industryReportSchema]);
const compareOrInvalid = z.union([invalidKeywordSchema, compareReportSchema]);

/** uri 기준 중복 제거(먼저 나온 항목 유지) — 조사 출처와 고용24 샘플 URL이 겹칠 수 있어 적용. */
function dedupeByUri<T extends { uri: string }>(items: T[]): T[] {
    const seen = new Set<string>();
    return items.filter(item => {
        if (seen.has(item.uri)) return false;
        seen.add(item.uri);
        return true;
    });
}

export async function generateAnalysis(req: AnalysisRequest, actor: Actor, ip: string, opts: { force?: boolean } = {}): Promise<Ok | Fail> {
    const cacheKey = buildCacheKey(req);
    try {
        const force = opts.force === true && actor.kind === 'admin';
        const fresh = force ? null : await findFreshReport(cacheKey);
        if (fresh) return finish(fresh, actor, true);

        const limit = await checkDailyLimit(actor, ip);
        if (!limit.allowed) return fail(429, limit.message, limit.retryAfterSec);

        const work24 = req.includeTrends && req.scope === 'kr' ? await fetchWork24Summary(req.keyword) : null;
        const research = req.includeCompetitors
            ? await callResearch(buildResearchPrompt(req), `"${req.keyword}" 조사 결과를 불릿으로 알려줘.`)
            : null;
        const ai = await callReport(req, work24, research);
        if (!ai.ok) return ai;

        const meta: ReportMeta = {
            // 'search'는 조사 호출 출처가 실제로 1건 이상일 때만 표시(경쟁사 ON이어도 조사가 저하되면 표시하지 않음).
            dataUsed: [...(work24 ? ['work24' as const] : []), ...(ai.sources.length > 0 ? ['search' as const] : [])],
            work24,
            sources: dedupeByUri([...ai.sources, ...(work24?.samples.map(s => ({ title: `[고용24] ${s.title} · ${s.company}`, uri: s.url })) ?? [])]),
            searchEntryPoint: ai.searchEntryPoint, modelName: ai.modelName,
        };
        const row = await saveReport({ type: req.type, keywords: [req.keyword], scope: req.scope, includeCompetitors: req.includeCompetitors, includeTrends: req.includeTrends, kind: 'single' }, cacheKey, ai, meta);
        if ('ok' in row) return row;
        return finish(row, actor, false);
    } catch (error) {
        if (isMissingTableError(error)) {
            logger.error('[분석] 테이블 없음 — scripts/create-analysis-schema.sql 실행 필요:', error);
            return fail(503, '분석 서비스 준비 중입니다. 잠시 후 다시 시도해 주세요.');
        }
        logger.error('[분석] 생성 실패:', error);
        return fail(503, 'AI 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    }
}

/**
 * 비교 리포트 생성(설계서 5.5) — keywords별 고용24 요약을 병렬 조회하는 점만 단일과 다르고,
 * 조사·리포트 호출·재시도·저장·완료는 generateAnalysis와 같은 내부 함수를 공유한다.
 */
export async function generateComparison(req: CompareRequest, actor: Actor, ip: string, opts: { force?: boolean } = {}): Promise<Ok | Fail> {
    const cacheKey = buildCompareCacheKey(req);
    try {
        const force = opts.force === true && actor.kind === 'admin';
        const fresh = force ? null : await findFreshReport(cacheKey);
        if (fresh) return finish(fresh, actor, true);

        const limit = await checkDailyLimit(actor, ip);
        if (!limit.allowed) return fail(429, limit.message, limit.retryAfterSec);

        const work24ByKeyword = req.includeTrends && req.scope === 'kr' ? await fetchWork24ByKeyword(req.keywords) : {};
        const research = req.includeCompetitors
            ? await callResearch(buildCompareResearchPrompt(req), `${req.keywords.map(k => `"${k}"`).join(', ')} 조사 결과를 불릿으로 알려줘.`)
            : null;
        const ai = await callCompareReport(req, work24ByKeyword, research);
        if (!ai.ok) return ai;

        const work24Samples = Object.entries(work24ByKeyword)
            .flatMap(([k, w]) => w?.samples.map(s => ({ title: `[고용24·${k}] ${s.title} · ${s.company}`, uri: s.url })) ?? []);
        const meta: ReportMeta = {
            dataUsed: [...(Object.values(work24ByKeyword).some(w => w !== null) ? ['work24' as const] : []), ...(ai.sources.length > 0 ? ['search' as const] : [])],
            work24: null,
            work24ByKeyword,
            sources: dedupeByUri([...ai.sources, ...work24Samples]),
            searchEntryPoint: ai.searchEntryPoint, modelName: ai.modelName,
        };
        const row = await saveReport({ type: req.type, keywords: req.keywords, scope: req.scope, includeCompetitors: req.includeCompetitors, includeTrends: req.includeTrends, kind: 'compare' }, cacheKey, ai, meta);
        if ('ok' in row) return row;
        return finish(row, actor, false);
    } catch (error) {
        if (isMissingTableError(error)) {
            logger.error('[분석] 테이블 없음 — scripts/create-analysis-schema.sql 실행 필요:', error);
            return fail(503, '분석 서비스 준비 중입니다. 잠시 후 다시 시도해 주세요.');
        }
        logger.error('[분석] 비교 리포트 생성 실패:', error);
        return fail(503, 'AI 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    }
}

/** 키워드별 고용24 요약을 병렬 조회한다. fetchWork24Summary는 내부에서 실패를 null로 삼키지만, 혹시 던지더라도 그 키워드만 null로 두고 계속한다. */
async function fetchWork24ByKeyword(keywords: string[]): Promise<Record<string, Work24Summary | null>> {
    const pairs = await Promise.all(keywords.map(async (k): Promise<[string, Work24Summary | null]> => {
        try {
            return [k, await fetchWork24Summary(k)];
        } catch (error) {
            logger.warn(`[분석] 고용24 조회 실패(키워드: ${k}):`, error);
            return [k, null];
        }
    }));
    return Object.fromEntries(pairs);
}

/** AI 호출이 끝난 리포트를 저장한다. 저장(DB) 실패는 AI 연결 실패와 구분되는 메시지의 503으로 반환한다. */
async function saveReport(
    input: { type: AnalysisRequest['type']; keywords: string[]; scope: AnalysisRequest['scope']; includeCompetitors: boolean; includeTrends: boolean; kind: ReportKind },
    cacheKey: string, ai: ReportResult, meta: ReportMeta,
): Promise<StoredReport | Fail> {
    try {
        return await insertReport({ ...input, cacheKey, content: ai.content, meta, modelName: ai.modelName, inputTokens: ai.inputTokens, outputTokens: ai.outputTokens, ttlDays: REPORT_CACHE_TTL_DAYS });
    } catch (error) {
        if (isMissingTableError(error)) {
            logger.error('[분석] 테이블 없음 — scripts/create-analysis-schema.sql 실행 필요:', error);
            return fail(503, '분석 서비스 준비 중입니다. 잠시 후 다시 시도해 주세요.');
        }
        logger.error('[분석] 리포트 저장 실패:', error);
        return fail(503, '리포트 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    }
}

async function finish(row: StoredReport, actor: Actor, cached: boolean): Promise<Ok> {
    await recordRequest(row.id, actor, cached);
    // 보관함 저장 실패(예: 탈퇴한 사용자의 남은 쿠키 → FK 위반)는 리포트 생성 자체와 무관하므로
    // 로그만 남기고 "AI 연결 실패"로 보고하지 않는다 — recordRequest와 같은 방식.
    if (actor.kind === 'user') {
        try {
            await addToLibrary(actor.userId, row.id);
        } catch (error) {
            logger.error('[분석] 보관함 저장 실패:', error);
        }
    }
    return { ok: true, report: toPublicReport(row), cached };
}

/**
 * 경쟁사·채용 동향 조사 1회(챗 모델 + googleSearch, JSON 모드 끔). 재시도하지 않는다(짧은 보조 호출).
 * 실패하거나 sources가 0건이면 null을 반환해 리포트가 학습 지식으로 저하되게 한다.
 * 단일·비교 모두 프롬프트·사용자 메시지만 다르고 호출 방식은 같아 공유한다.
 */
async function callResearch(prompt: string, userMsg: string): Promise<Research | null> {
    const { generateResponse } = await import('@/lib/gemini');
    const { logApiUsage } = await import('@/lib/db');
    try {
        const r = await generateResponse(prompt, userMsg, false, { googleSearch: true });
        await logApiUsage(r.modelName, r.usageMetadata?.promptTokenCount ?? 0, r.usageMetadata?.candidatesTokenCount ?? 0, r.usageMetadata?.totalTokenCount ?? 0, 'analysis');
        if (r.sources.length === 0) {
            logger.warn('[분석] 조사 호출 출처 0건 — 학습 지식으로 저하');
            return null;
        }
        return { text: r.text, sources: r.sources, searchEntryPoint: r.searchEntryPoint };
    } catch (error) {
        logger.warn('[분석] 조사 호출 실패 — 학습 지식으로 저하:', error);
        return null;
    }
}

/**
 * 리포트 1회 호출(분석 모델·JSON, googleSearch 미사용) + 검증 실패 시 1회 재시도. invalid면 400.
 * schema는 호출부가 요청 유형에 맞는 invalid-union 스키마를 넘긴다 — 응답이 다른 유형 모양이면 safeParse가
 * 그대로 실패하므로(예: 비교 응답에 job 스키마를 대면 roadmap 등 필수 필드가 없어 거부) 별도 "유형 불일치" 검사가 필요 없다.
 */
async function runReport(prompt: string, userMsg: string, schema: z.ZodTypeAny): Promise<ReportCallResult | Fail> {
    const { generateResponse, safeParseJSON } = await import('@/lib/gemini');
    const { logApiUsage } = await import('@/lib/db');
    for (let attempt = 0; attempt < 2; attempt++) {
        const ai = await generateResponse(prompt, userMsg, true);
        const inputTokens = ai.usageMetadata?.promptTokenCount ?? 0, outputTokens = ai.usageMetadata?.candidatesTokenCount ?? 0;
        await logApiUsage(ai.modelName, inputTokens, outputTokens, ai.usageMetadata?.totalTokenCount ?? 0, 'analysis');
        const parsed = schema.safeParse(safeParseJSON(ai.text));
        if (!parsed.success) {
            logger.warn(`[분석] JSON 검증 실패 (시도 ${attempt + 1}):`, parsed.error.issues.slice(0, 3));
            continue;
        }
        const data = parsed.data as ReportContent | { invalid: true; reason: string };
        if ('invalid' in data) return fail(400, `직무·산업 키워드로 다시 입력해 주세요. (${data.reason})`);
        return { ok: true, content: data, modelName: ai.modelName, inputTokens, outputTokens };
    }
    return fail(502, '리포트를 만들지 못했습니다. 키워드를 바꿔 다시 시도해 주세요.');
}

/** 단일 리포트 호출 — 프롬프트·스키마를 조립해 runReport에 넘기고 조사 출처를 붙인다. */
async function callReport(req: AnalysisRequest, work24: Work24Summary | null, research: Research | null): Promise<ReportResult | Fail> {
    const prompt = buildAnalysisPrompt(req, work24, research?.text ?? null);
    const schema = req.type === 'job' ? jobOrInvalid : industryOrInvalid;
    const r = await runReport(prompt, analysisUserMessage(req), schema);
    if (!r.ok) return r;
    return { ...r, sources: research?.sources ?? [], searchEntryPoint: research?.searchEntryPoint ?? null };
}

/** 비교 리포트 호출 — 키워드별 고용24 요약을 프롬프트에 담아 runReport에 넘기고 조사 출처를 붙인다. */
async function callCompareReport(req: CompareRequest, work24ByKeyword: Record<string, Work24Summary | null>, research: Research | null): Promise<ReportResult | Fail> {
    const prompt = buildComparePrompt(req, work24ByKeyword, research?.text ?? null);
    const r = await runReport(prompt, compareUserMessage(req), compareOrInvalid);
    if (!r.ok) return r;
    return { ...r, sources: research?.sources ?? [], searchEntryPoint: research?.searchEntryPoint ?? null };
}
