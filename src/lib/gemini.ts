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
}

/**
 * Gemini 모델에 메시지를 전송하고 응답을 받는 함수
 * 키 실패(401/403/429/503 등) 시 다음 등록된 키로 순차 재시도
 * @param systemPrompt - AI의 역할과 제약을 정의하는 시스템 프롬프트
 * @param userMessage - 사용자 메시지 또는 분석 요청
 * @param useAnalysisModel - true이면 분석용 모델(gemini_analysis_model_name) 사용, 기본은 일반 챗 모델(gemini_model_name)
 * @returns 텍스트 응답, 토큰 사용량, 모델 이름이 포함된 객체
 */
export async function generateResponse(
    systemPrompt: string,
    userMessage: string,
    useAnalysisModel: boolean = false
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
        logger.warn(`[Gemini] ${settingKey}='${stored ?? ''}' 는 사용할 수 없어 기본값 '${configuredModel}'로 대체되었습니다.`);
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
                config: {
                    temperature: 0.1,
                    maxOutputTokens,
                    responseMimeType: 'application/json',
                    thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
                },
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
            };

        } catch (error: unknown) {
            lastError = error;
            const status = error instanceof ApiError ? error.status : undefined;
            const message = error instanceof Error ? error.message : String(error);

            // 403 (Forbidden), 401 (Unauthorized), 429 (Too Many Requests), 503 -> 다음 키 시도
            if (
                status === 403 || status === 401 || status === 429 || status === 503 ||
                message.includes('403') || message.includes('leaked') || message.includes('API key not valid')
            ) {
                logger.warn(`[Gemini API] Key ${i + 1}/${keys.length} failed (Status: ${status}). error: ${message}. trying next key...`);
                // 마지막 키가 아니라면 다음 루프로 진행
                continue;
            }

            logger.error(`[Gemini API] Key ${i + 1} unexpected error:`, error);
            // 알 수 없는 에러여도 다음 키가 있으면 시도
            continue;
        }
    }

    // 루프를 다 돌았는데도 성공하지 못한 경우
    logger.error('All Gemini API keys failed. Last error:', lastError);
    throw new Error('AI 서비스 연결에 실패했습니다. (모든 API 키 호출 실패)');
}

/**
 * Gemini 응답 텍스트에서 JSON을 안전하게 파싱하는 함수
 * JSON 파싱 실패 시 null 반환
 * @param text - Gemini 응답 원시 텍스트
 * @returns 파싱된 객체 또는 null
 */
export function safeParseJSON<T>(text: string): T | null {
    try {
        // 마크다운 코드 블록 제거 후 파싱 (```json ... ``` 형태 대응)
        const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(cleaned) as T;
    } catch {
        // JSON 파싱 실패 시 null 반환
        logger.error('JSON 파싱 실패:', text);
        return null;
    }
}
