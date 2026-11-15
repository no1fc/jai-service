import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/gemini');
vi.mock('@/lib/db', () => ({ logApiUsage: vi.fn() }));
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: vi.fn() }));

import { generateResponse, safeParseJSON } from '@/lib/gemini';
import { logApiUsage } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';
import { buildSuggestPrompt, checkSuggestAiLimit, suggestWithAi } from './suggest-ai';

function fakeAiResponse(text: string) {
    return { text, usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1, totalTokenCount: 2 }, modelName: 'gemini-test', sources: [], searchEntryPoint: null };
}

beforeEach(() => {
    vi.resetAllMocks();
});

describe('buildSuggestPrompt', () => {
    it('입력 키워드를 데이터 블록 안에 그대로 넣고 JSON 출력 형식을 명시한다', () => {
        const prompt = buildSuggestPrompt('핀테크 PM');
        expect(prompt).toContain('핀테크 PM');
        expect(prompt).toContain('"suggestions"');
    });
});

describe('suggestWithAi', () => {
    it('정상 JSON이면 suggestions 배열을 반환하고 챗 모델로 호출한다(세 번째 인자 없음)', async () => {
        vi.mocked(generateResponse).mockResolvedValue(fakeAiResponse('raw'));
        vi.mocked(safeParseJSON).mockReturnValue({ suggestions: ['프로덕트 매니저', '그로스 PM'] });
        const result = await suggestWithAi('핀테크 PM');
        expect(result).toEqual(['프로덕트 매니저', '그로스 PM']);
        expect(generateResponse).toHaveBeenCalledWith(expect.any(String), '핀테크 PM');
        expect(logApiUsage).toHaveBeenCalledWith('gemini-test', 1, 1, 2, 'suggest');
    });

    it('스키마 검증에 실패하면(7개 이상) 빈 배열을 반환한다', async () => {
        vi.mocked(generateResponse).mockResolvedValue(fakeAiResponse('raw'));
        vi.mocked(safeParseJSON).mockReturnValue({ suggestions: Array.from({ length: 7 }, (_, i) => `직무${i}`) });
        expect(await suggestWithAi('핀테크 PM')).toEqual([]);
    });

    it('JSON 파싱 자체가 실패하면(safeParseJSON이 null) 빈 배열을 반환한다', async () => {
        vi.mocked(generateResponse).mockResolvedValue(fakeAiResponse('broken'));
        vi.mocked(safeParseJSON).mockReturnValue(null);
        expect(await suggestWithAi('핀테크 PM')).toEqual([]);
    });

    it('generateResponse가 예외를 던지면 빈 배열을 반환한다', async () => {
        vi.mocked(generateResponse).mockRejectedValue(new Error('AI 연결 실패'));
        expect(await suggestWithAi('핀테크 PM')).toEqual([]);
    });
});

describe('checkSuggestAiLimit', () => {
    it('전체·IP 모두 허용이면 true를 반환한다', () => {
        vi.mocked(checkRateLimit).mockReturnValue({ allowed: true, remaining: 1, resetAt: Date.now() + 1000 });
        expect(checkSuggestAiLimit('1.1.1.1')).toBe(true);
    });

    it('전체 한도(500/일)에 도달하면 false를 반환하고 IP 한도는 확인하지 않는다', () => {
        vi.mocked(checkRateLimit).mockReturnValueOnce({ allowed: false, remaining: 0, resetAt: Date.now() + 1000 });
        expect(checkSuggestAiLimit('1.1.1.1')).toBe(false);
        expect(checkRateLimit).toHaveBeenCalledTimes(1);
    });

    it('IP 한도(30/일)에 도달하면 false를 반환한다', () => {
        vi.mocked(checkRateLimit)
            .mockReturnValueOnce({ allowed: true, remaining: 1, resetAt: Date.now() + 1000 })
            .mockReturnValueOnce({ allowed: false, remaining: 0, resetAt: Date.now() + 1000 });
        expect(checkSuggestAiLimit('1.1.1.1')).toBe(false);
        expect(checkRateLimit).toHaveBeenCalledTimes(2);
    });
});
