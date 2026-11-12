/**
 * Gemini AI API 클라이언트 유틸리티
 * `@google/genai` SDK를 사용하는 헬퍼 함수 모음.
 * Temperature 0.1로 설정하여 환각 방지.
 * 용도별로 일반 응답 모델(gemini_model_name)과 분석 모델(gemini_analysis_model_name)을
 * 분리해서 사용하며, DB 저장값이 카탈로그에 없거나 종료(deprecated)된 모델이면
 * `gemini-models.ts`의 기본값으로 자동 대체한다.
 */

import { ApiError, GoogleGenAI, ThinkingLevel } from '@google/genai';

import { getSetting } from '@/lib/db';
import { logger } from '@/lib/logger';
import { DEFAULT_ANALYSIS_MODEL, DEFAULT_CHAT_MODEL, resolveGeminiModel } from '@/lib/gemini-models';

export interface GeminiResponse {
    text: string;
    usageMetadata: {
        promptTokenCount: number;
        candidatesTokenCount: number;
        totalTokenCount: number;
    } | null;
    modelName: string;
    sources: Array<{ title: string; uri: string }>;
    searchEntryPoint: string | null;
}

// 모델 폴백 경고를 프로세스당 (설정키→대체 모델) 조합마다 한 번만 로그하기 위한 기록.
const loggedModelFallbacks = new Set<string>();

/**
 * 다음 API 키로 재시도할지 여부를 판단한다.
 * 401/403/429/5xx 상태 코드 또는 상태 코드가 없는 네트워크류 오류만 재시도 대상이며,
 * 400/404처럼 요청 자체가 잘못된 경우는 다른 키로 재시도해도 결과가 같으므로 즉시 실패시킨다.
 */
export function isRetryableGeminiError(error: unknown): boolean {
    const status = error instanceof ApiError ? error.status : undefined;
    if (status === undefined) return true; // 네트워크 오류 등 상태 코드가 없는 경우
    return status === 401 || status === 403 || status === 429 || status >= 500;
}

/**
 * generateContent 호출용 config를 만든다(순수 함수).
 * googleSearch 사용 시 responseMimeType('application/json')을 넣지 않는다 — Gemini가 JSON 강제 모드와
 * 검색 그라운딩을 함께 쓰면 groundingMetadata(출처)를 비워 반환하는 현상이 있어, 호출 1회를 유지하기 위해
 * 이 경우만 JSON 모드를 끈다. JSON 형식은 프롬프트가 이미 요구하므로 파싱은 safeParseJSON + Zod 검증이 담당한다.
 */
export function buildGeminiConfig(maxOutputTokens: number, options: { googleSearch?: boolean } = {}) {
    const base = {
        temperature: 0.1,
        maxOutputTokens,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    };
    return options.googleSearch
        ? { ...base, tools: [{ googleSearch: {} }] }
        : { ...base, responseMimeType: 'application/json' as const };
}

const HTTP_URL_RE = /^https?:\/\//i;

/** 그라운딩 메타데이터에서 출처와 검색 제안 HTML을 뽑는다(없으면 빈 값).
 * http(s) 스킴이 아닌 URL은 제외하고, 같은 uri가 여러 번 나오면 먼저 나온 것만 남긴다
 * (중복 uri가 React 리스트의 key로 쓰이면서 중복 key 오류가 나던 문제의 근본 수정). */
export function extractGrounding(candidate: { groundingMetadata?: { groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>; searchEntryPoint?: { renderedContent?: string } } } | undefined) {
    const chunks = candidate?.groundingMetadata?.groundingChunks ?? [];
    const seen = new Set<string>();
    const sources: Array<{ uri: string; title: string }> = [];
    for (const c of chunks) {
        const uri = c.web?.uri;
        if (!uri || !HTTP_URL_RE.test(uri) || seen.has(uri)) continue;
        seen.add(uri);
        sources.push({ uri, title: c.web?.title || uri });
    }
    return { sources, searchEntryPoint: candidate?.groundingMetadata?.searchEntryPoint?.renderedContent ?? null };
}

/**
 * Gemini 모델에 메시지를 전송하고 응답을 받는 함수
 * 키 실패(401/403/429/503 등) 시 다음 등록된 키로 순차 재시도
 * @param systemPrompt - AI의 역할과 제약을 정의하는 시스템 프롬프트
 * @param userMessage - 사용자 메시지 또는 분석 요청
 * @param useAnalysisModel - true이면 분석용 모델(gemini_analysis_model_name) 사용, 기본은 일반 챗 모델(gemini_model_name)
 * @param options - googleSearch: true면 Google 검색 그라운딩 도구를 활성화
 * @returns 텍스트 응답, 토큰 사용량, 모델 이름, 그라운딩 출처가 포함된 객체
 */
export async function generateResponse(
    systemPrompt: string,
    userMessage: string,
    useAnalysisModel: boolean = false,
    options: { googleSearch?: boolean } = {}
): Promise<GeminiResponse> {
    const keysRaw = await getSetting('gemini_api_keys');
    let keys: string[] = [];
    if (keysRaw) {
        try {
            keys = JSON.parse(keysRaw);
            if (!Array.isArray(keys)) keys = [];
        } catch (e) {
            keys = [];
        }
    }

    // 환경 변수에 값이 있고, 배열에 없다면 추가
    if (keys.length === 0 && process.env.GEMINI_API_KEY) {
        keys.push(process.env.GEMINI_API_KEY);
    }

    if (keys.length === 0) {
        throw new Error('Gemini API 키가 설정되지 않았습니다.');
    }

    // 용도별 설정값을 조회하고, 종료/미카탈로그 모델이면 기본값으로 대체 (DB 값은 바꾸지 않음)
    const settingKey = useAnalysisModel ? 'gemini_analysis_model_name' : 'gemini_model_name';
    const fallback = useAnalysisModel ? DEFAULT_ANALYSIS_MODEL : DEFAULT_CHAT_MODEL;
    const stored = await getSetting(settingKey);
    const { id: configuredModel, replaced } = resolveGeminiModel(stored, fallback);
    if (replaced) {
        const fallbackKey = `${settingKey}:${stored ?? ''}->${configuredModel}`;
        if (!loggedModelFallbacks.has(fallbackKey)) {
            loggedModelFallbacks.add(fallbackKey);
            logger.warn(`[Gemini] ${settingKey}='${stored ?? ''}' 는 사용할 수 없어 기본값 '${configuredModel}'로 대체되었습니다.`);
        }
    }

    // 시스템 프롬프트와 사용자 메시지를 하나의 프롬프트로 결합
    const fullPrompt = `${systemPrompt}\n\n---\n\n${userMessage}`;
    const maxOutputTokens = useAnalysisModel ? 8192 : 2048;

    let lastError: unknown = null;

    // 등록된 API 키들을 순회하며 요청 시도
    for (let i = 0; i < keys.length; i++) {
        const apiKey = keys[i];
        try {
            const ai = new GoogleGenAI({ apiKey });

            const response = await ai.models.generateContent({
                model: configuredModel,
                contents: fullPrompt,
                config: buildGeminiConfig(maxOutputTokens, options),
            });

            const usage = response.usageMetadata;
            // thinking 토큰도 출력 비용에 포함되므로 candidatesTokenCount에 합산해 비용 집계를 맞춘다.
            const candidatesTokenCount = (usage?.candidatesTokenCount ?? 0) + (usage?.thoughtsTokenCount ?? 0);

            return {
                text: response.text ?? '',
                usageMetadata: usage ? {
                    promptTokenCount: usage.promptTokenCount ?? 0,
                    candidatesTokenCount,
                    totalTokenCount: usage.totalTokenCount ?? 0,
                } : null,
                modelName: configuredModel,
                ...extractGrounding(response.candidates?.[0]),
            };

        } catch (error: unknown) {
            lastError = error;
            const status = error instanceof ApiError ? error.status : undefined;
            const message = error instanceof Error ? error.message : String(error);

            if (!isRetryableGeminiError(error)) {
                // 400/404 등 요청 자체가 잘못된 경우는 다른 키로 재시도해도 동일하게 실패하므로 즉시 중단한다.
                logger.error(`[Gemini API] Key ${i + 1} 재시도 불가능한 오류 (Status: ${status}): ${message}`);
                throw new Error('AI 서비스 연결에 실패했습니다. (모든 API 키 호출 실패)');
            }

            logger.warn(`[Gemini API] Key ${i + 1}/${keys.length} failed (Status: ${status}). error: ${message}. trying next key...`);
            // 마지막 키가 아니라면 다음 루프로 진행
            continue;
        }
    }

    // 루프를 다 돌았는데도 성공하지 못한 경우
    logger.error('All Gemini API keys failed. Last error:', lastError);
    throw new Error('AI 서비스 연결에 실패했습니다. (모든 API 키 호출 실패)');
}

/**
 * Gemini 응답 텍스트에서 JSON을 안전하게 파싱하는 함수
 * 마크다운 코드블록 제거 후에도 실패하면(그라운딩 응답은 JSON 앞뒤에 설명 문장이 붙을 수 있음)
 * 첫 "{"부터 마지막 "}"까지만 잘라 한 번 더 시도한다. 그래도 실패하면 null 반환.
 * @param text - Gemini 응답 원시 텍스트
 * @returns 파싱된 객체 또는 null
 */
export function safeParseJSON<T>(text: string): T | null {
    // 마크다운 코드 블록 제거 (```json ... ``` 형태 대응)
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    try {
        return JSON.parse(cleaned) as T;
    } catch {
        const start = cleaned.indexOf('{');
        const end = cleaned.lastIndexOf('}');
        if (start !== -1 && end > start) {
            try {
                return JSON.parse(cleaned.slice(start, end + 1)) as T;
            } catch {
                // 중괄호 구간을 잘라도 실패하면 아래에서 null 처리
            }
        }
        // JSON 파싱 실패 시 null 반환. 로그에는 원문 앞 200자만 남긴다(긴 응답으로 로그가 오염되는 것 방지).
        logger.error('JSON 파싱 실패:', text.slice(0, 200));
        return null;
    }
}
