import { describe, expect, it } from 'vitest';
import {
    DEFAULT_ANALYSIS_MODEL,
    DEFAULT_CHAT_MODEL,
    GEMINI_MODELS,
    resolveGeminiModel,
} from './gemini-models';

describe('resolveGeminiModel', () => {
    it('저장값이 없으면 기본값으로 대체한다', () => {
        expect(resolveGeminiModel(null, DEFAULT_CHAT_MODEL)).toEqual({ id: 'gemini-3.5-flash-lite', replaced: true });
    });

    it('deprecated 모델이면 기본값으로 대체한다', () => {
        expect(resolveGeminiModel('gemini-2.5-flash', DEFAULT_CHAT_MODEL).replaced).toBe(true);
    });

    it('카탈로그에 없는 모델이면 기본값으로 대체한다', () => {
        expect(resolveGeminiModel('gemini-3-pro-preview', DEFAULT_ANALYSIS_MODEL)).toEqual({ id: 'gemini-3.8-flash', replaced: true });
    });

    it('stable 모델이면 그대로 사용한다', () => {
        expect(resolveGeminiModel('gemini-4-carbon', DEFAULT_CHAT_MODEL)).toEqual({ id: 'gemini-4-carbon', replaced: false });
    });

    it('기본값 2개는 카탈로그에 stable로 존재한다', () => {
        const chat = GEMINI_MODELS.find((m) => m.id === DEFAULT_CHAT_MODEL);
        const analysis = GEMINI_MODELS.find((m) => m.id === DEFAULT_ANALYSIS_MODEL);
        expect(chat?.status).toBe('stable');
        expect(analysis?.status).toBe('stable');
    });

    it('카탈로그 id는 중복이 없다', () => {
        const ids = GEMINI_MODELS.map((m) => m.id);
        expect(new Set(ids).size).toBe(ids.length);
    });
});
