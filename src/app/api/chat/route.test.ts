import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/gemini');
vi.mock('@/lib/db', () => ({ getSetting: vi.fn().mockResolvedValue(null), logApiUsage: vi.fn() }));
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: vi.fn(), getClientIp: vi.fn() }));

import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { POST } from './route';

function postRequest(body: unknown) {
    return new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: typeof body === 'string' ? body : JSON.stringify(body),
        headers: { 'content-type': 'application/json' },
    });
}

beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getClientIp).mockReturnValue('1.1.1.1');
    vi.mocked(checkRateLimit).mockReturnValue({ allowed: true, remaining: 9, resetAt: Date.now() + 1000 });
});

describe('POST /api/chat', () => {
    it('intro 단계는 Gemini 호출 없이 기본 인트로 메시지를 반환한다', async () => {
        const res = await POST(postRequest({ phase: 'intro', userAnswers: {}, currentStep: 0 }));
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.phase).toBe('intro');
        expect(json.choices).toEqual(expect.arrayContaining([expect.objectContaining({ value: 'info' })]));
    });

    it('questioning 단계는 다음 질문을 순서대로 반환한다(age부터)', async () => {
        const res = await POST(postRequest({ phase: 'questioning', userAnswers: {}, currentStep: 0 }));
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.questionId).toBe('age');
        expect(json.currentStep).toBe(1);
    });

    it('analyzing 단계에서 error 레벨 모순(C1: 미성년+병역)이 있으면 판정 전에 400을 반환한다', async () => {
        const res = await POST(postRequest({
            phase: 'analyzing',
            userAnswers: { age: '17', militaryMonths: '12' },
            currentStep: 12,
        }));
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toContain('답변이 서로 맞지 않습니다');
        expect(json.error).toContain('병역');
    });

    it('analyzing 단계에서 rate limit에 걸리면 429를 반환하고 모순 검사 전에 막는다', async () => {
        vi.mocked(checkRateLimit).mockReturnValue({ allowed: false, remaining: 0, resetAt: Date.now() + 1000 });
        const res = await POST(postRequest({ phase: 'analyzing', userAnswers: {}, currentStep: 12 }));
        expect(res.status).toBe(429);
    });

    it('본문 검증에 실패하면 400을 반환한다', async () => {
        const res = await POST(postRequest({ phase: 'unknown-phase' }));
        expect(res.status).toBe(400);
    });
});
