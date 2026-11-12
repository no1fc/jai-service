/**
 * 리포트 생성 오케스트레이터 — 서버 전용.
 * 캐시 → 한도 → 고용24(옵션) → [경쟁사 ON] 조사 1회(챗 모델·검색) → 리포트 1회(분석 모델·JSON, 실패 시 1회 재시도) → 저장 → 요청 기록.
 * 조사는 경쟁사 ON일 때만 실행하고, 실패하거나 출처 0건이면 null(학습 지식으로 저하)로 리포트 호출을 계속한다.
 * 긴 리포트 프롬프트에 googleSearch를 붙이면 모델이 검색을 거의 하지 않는 실험 결과(설계서 3.2절)에 따라
 * 호출 1회가 아니라 조사·리포트 2회로 분리하기로 결정했다(Task 3 재스파이크, `fix: 검색 그라운딩 시 JSON 모드 해제` 커밋).
 */
import { logger } from '@/lib/logger';
import { buildCacheKey, normalizeKeyword } from './cache-key';
import { analysisUserMessage, buildAnalysisPrompt, buildResearchPrompt } from './prompt';
import { REPORT_CACHE_TTL_DAYS, reportContentSchema, type AnalysisRequest, type PublicReport, type ReportContent, type ReportMeta, type Work24Summary } from './schema';
import { checkDailyLimit } from './limits';
import { fetchWork24Summary } from './work24';
import { addToLibrary, findFreshReport, insertReport, isMissingTableError, recordRequest, toPublicReport, type Actor, type StoredReport } from './reports';

type Ok = { ok: true; report: PublicReport; cached: boolean };
type Fail = { ok: false; status: 400 | 429 | 502 | 503; error: string; retryAfterSec?: number };
const fail = (status: Fail['status'], error: string, retryAfterSec?: number): Fail => ({ ok: false, status, error, retryAfterSec });
type Research = { text: string; sources: ReportMeta['sources']; searchEntryPoint: string | null };
type ReportResult = { ok: true; content: ReportContent; sources: ReportMeta['sources']; searchEntryPoint: string | null; modelName: string; inputTokens: number; outputTokens: number };

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
        const research = req.includeCompetitors ? await callResearch(req) : null;
        const ai = await callReport(req, work24, research);
        if (!ai.ok) return ai;

        const meta: ReportMeta = {
            // 'search'는 조사 호출 출처가 실제로 1건 이상일 때만 표시(경쟁사 ON이어도 조사가 저하되면 표시하지 않음).
            dataUsed: [...(work24 ? ['work24' as const] : []), ...(ai.sources.length > 0 ? ['search' as const] : [])],
            work24,
            sources: dedupeByUri([...ai.sources, ...(work24?.samples.map(s => ({ title: `[고용24] ${s.title} · ${s.company}`, uri: s.url })) ?? [])]),
            searchEntryPoint: ai.searchEntryPoint, modelName: ai.modelName,
        };
        const row = await saveReport(req, cacheKey, ai, meta);
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

/** AI 호출이 끝난 리포트를 저장한다. 저장(DB) 실패는 AI 연결 실패와 구분되는 메시지의 503으로 반환한다. */
async function saveReport(req: AnalysisRequest, cacheKey: string, ai: ReportResult, meta: ReportMeta): Promise<StoredReport | Fail> {
    try {
        return await insertReport({ req, keywordNorm: normalizeKeyword(req.keyword), cacheKey, content: ai.content, meta, modelName: ai.modelName, inputTokens: ai.inputTokens, outputTokens: ai.outputTokens, ttlDays: REPORT_CACHE_TTL_DAYS });
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
 */
async function callResearch(req: AnalysisRequest): Promise<Research | null> {
    const { generateResponse } = await import('@/lib/gemini');
    const { logApiUsage } = await import('@/lib/db');
    try {
        const r = await generateResponse(buildResearchPrompt(req), `"${req.keyword}" 조사 결과를 불릿으로 알려줘.`, false, { googleSearch: true });
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

/** 리포트 1회 호출(분석 모델·JSON, googleSearch 미사용) + 검증 실패 시 1회 재시도. invalid면 400. */
async function callReport(req: AnalysisRequest, work24: Work24Summary | null, research: Research | null): Promise<ReportResult | Fail> {
    const { generateResponse, safeParseJSON } = await import('@/lib/gemini');
    const { logApiUsage } = await import('@/lib/db');
    const prompt = buildAnalysisPrompt(req, work24, research?.text ?? null);
    for (let attempt = 0; attempt < 2; attempt++) {
        const ai = await generateResponse(prompt, analysisUserMessage(req), true);
        const inputTokens = ai.usageMetadata?.promptTokenCount ?? 0, outputTokens = ai.usageMetadata?.candidatesTokenCount ?? 0;
        await logApiUsage(ai.modelName, inputTokens, outputTokens, ai.usageMetadata?.totalTokenCount ?? 0, 'analysis');
        const parsed = reportContentSchema.safeParse(safeParseJSON(ai.text));
        if (!parsed.success) {
            logger.warn(`[분석] JSON 검증 실패 (시도 ${attempt + 1}):`, parsed.error.issues.slice(0, 3));
            continue;
        }
        if ('invalid' in parsed.data) return fail(400, `직무·산업 키워드로 다시 입력해 주세요. (${parsed.data.reason})`);
        // 유형 불일치: 요청 유형과 응답 스키마(roadmap 유무로 직무/산업 구분)가 다르면 거부하고 재시도.
        const isJobShape = 'roadmap' in parsed.data;
        if (isJobShape !== (req.type === 'job')) {
            logger.warn(`[분석] 응답 유형 불일치 (시도 ${attempt + 1})`);
            continue;
        }
        return {
            ok: true as const, content: parsed.data,
            sources: research?.sources ?? [], searchEntryPoint: research?.searchEntryPoint ?? null,
            modelName: ai.modelName, inputTokens, outputTokens,
        };
    }
    return fail(502, '리포트를 만들지 못했습니다. 키워드를 바꿔 다시 시도해 주세요.');
}
