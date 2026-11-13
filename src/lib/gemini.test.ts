import { describe, expect, it } from 'vitest';
import { ApiError } from '@google/genai';
import { isRetryableGeminiError, safeParseJSON } from './gemini';

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
});
