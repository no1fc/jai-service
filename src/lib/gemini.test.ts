import { describe, expect, it } from 'vitest';
import { ApiError } from '@google/genai';
import { buildGeminiConfig, extractGrounding, isRetryableGeminiError, safeParseJSON } from './gemini';

function apiErrorWithStatus(status: number): ApiError {
    // ApiError 생성자는 ApiErrorInfo 형태를 받는다.
    return new ApiError({ message: 'test', status });
}

describe('isRetryableGeminiError', () => {
    it('401/403/429/5xx는 재시도 대상이다', () => {
        expect(isRetryableGeminiError(apiErrorWithStatus(401))).toBe(true);
        expect(isRetryableGeminiError(apiErrorWithStatus(403))).toBe(true);
        expect(isRetryableGeminiError(apiErrorWithStatus(429))).toBe(true);
        expect(isRetryableGeminiError(apiErrorWithStatus(503))).toBe(true);
    });
    it('400/404는 재시도 대상이 아니다', () => {
        expect(isRetryableGeminiError(apiErrorWithStatus(400))).toBe(false);
        expect(isRetryableGeminiError(apiErrorWithStatus(404))).toBe(false);
    });
    it('상태 코드가 없는 네트워크 오류는 재시도 대상이다', () => {
        expect(isRetryableGeminiError(new TypeError('fetch failed'))).toBe(true);
    });
});

describe('safeParseJSON', () => {
    it('정상 JSON을 파싱한다', () => {
        expect(safeParseJSON<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
    });
    it('파싱 실패 시 null을 반환한다', () => {
        expect(safeParseJSON('not json')).toBeNull();
    });
    it('코드블록 제거 후에도 실패하면 첫 { 부터 마지막 } 까지 잘라 재시도한다', () => {
        const text = '요청하신 요약은 다음과 같습니다.\n{"a":1}\n이상입니다.';
        expect(safeParseJSON<{ a: number }>(text)).toEqual({ a: 1 });
    });
});

describe('buildGeminiConfig', () => {
    it('googleSearch가 true면 responseMimeType이 없고 tools가 있다', () => {
        const config = buildGeminiConfig(2048, { googleSearch: true });
        expect(config).not.toHaveProperty('responseMimeType');
        if (!('tools' in config)) throw new Error('tools가 있어야 한다');
        expect(config.tools).toEqual([{ googleSearch: {} }]);
    });
    it('기본 호출이면 responseMimeType이 application/json이고 tools가 없다', () => {
        const config = buildGeminiConfig(2048);
        expect(config).not.toHaveProperty('tools');
        if (!('responseMimeType' in config)) throw new Error('responseMimeType이 있어야 한다');
        expect(config.responseMimeType).toBe('application/json');
    });
});

describe('extractGrounding', () => {
    it('groundingChunks를 sources로, searchEntryPoint를 문자열로 뽑는다', () => {
        const c = { groundingMetadata: { groundingChunks: [{ web: { uri: 'https://a', title: 'A' } }, { web: { uri: 'https://b' } }], searchEntryPoint: { renderedContent: '<div>x</div>' } } };
        expect(extractGrounding(c)).toEqual({ sources: [{ uri: 'https://a', title: 'A' }, { uri: 'https://b', title: 'https://b' }], searchEntryPoint: '<div>x</div>' });
    });
    it('메타데이터가 없으면 빈 값', () => {
        expect(extractGrounding(undefined)).toEqual({ sources: [], searchEntryPoint: null });
    });
    it('http(s)가 아닌 uri는 제외한다', () => {
        const c = { groundingMetadata: { groundingChunks: [{ web: { uri: 'javascript:alert(1)', title: 'bad' } }, { web: { uri: 'https://ok' } }] } };
        expect(extractGrounding(c).sources).toEqual([{ uri: 'https://ok', title: 'https://ok' }]);
    });
    it('같은 uri가 여러 번 나오면 먼저 나온 것만 남긴다', () => {
        const c = { groundingMetadata: { groundingChunks: [{ web: { uri: 'https://a', title: 'A1' } }, { web: { uri: 'https://a', title: 'A2' } }] } };
        expect(extractGrounding(c).sources).toEqual([{ uri: 'https://a', title: 'A1' }]);
    });
});
