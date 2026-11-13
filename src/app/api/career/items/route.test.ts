import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/career/items-store');
vi.mock('@/lib/gemini');
vi.mock('@/lib/db', () => ({ logApiUsage: vi.fn() }));
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: vi.fn(), getClientIp: vi.fn() }));

import { getCachedJobItems, putCachedJobItems } from '@/lib/career/items-store';
import { generateResponse, safeParseJSON } from '@/lib/gemini';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { POST } from './route';

const validItems = [
    { id: 'job_1', competency: 'communication', text: '맞춤 문항 텍스트를 20자 이상으로 길게 채운다' },
    { id: 'job_2', competency: 'problemSolving', text: '맞춤 문항 텍스트를 20자 이상으로 길게 채운다' },
    { id: 'job_3', competency: 'teamwork', text: '맞춤 문항 텍스트를 20자 이상으로 길게 채운다' },
    { id: 'job_4', competency: 'jobKnowledge', text: '맞춤 문항 텍스트를 20자 이상으로 길게 채운다' },
];

function postRequest(body: unknown) {
    return new NextRequest('http://localhost/api/career/items', {
        method: 'POST',
        body: typeof body === 'string' ? body : JSON.stringify(body),
        headers: { 'content-type': 'application/json' },
    });
}

function fakeAiResponse(text: string) {
    return { text, usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1, totalTokenCount: 2 }, modelName: 'gemini-test', sources: [], searchEntryPoint: null };
}

beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getClientIp).mockReturnValue('1.1.1.1');
    vi.mocked(checkRateLimit).mockReturnValue({ allowed: true, remaining: 19, resetAt: Date.now() + 1000 });
});

describe('POST /api/career/items', () => {
    it('rate limit에 걸리면 429를 반환하고 generateResponse를 호출하지 않는다', async () => {
        vi.mocked(checkRateLimit).mockReturnValue({ allowed: false, remaining: 0, resetAt: Date.now() + 1000 });
        const res = await POST(postRequest({ desiredJob: '웹 개발' }));
        expect(res.status).toBe(429);
        expect(generateResponse).not.toHaveBeenCalled();
    });

    it('본문 JSON이 깨지면 400을 반환한다', async () => {
        const res = await POST(postRequest('{broken'));
        expect(res.status).toBe(400);
    });

    it('desiredJob이 없으면 400을 반환한다', async () => {
        const res = await POST(postRequest({}));
        expect(res.status).toBe(400);
        expect(generateResponse).not.toHaveBeenCalled();
    });

    it('캐시 적중이면 generateResponse를 호출하지 않고 캐시 문항을 반환한다', async () => {
        vi.mocked(getCachedJobItems).mockResolvedValue(validItems);
        const res = await POST(postRequest({ desiredJob: '웹 개발' }));
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json).toEqual({ success: true, items: validItems });
        expect(generateResponse).not.toHaveBeenCalled();
        expect(putCachedJobItems).not.toHaveBeenCalled();
    });

    it('캐시 미스 + 정상 JSON이면 캐시에 저장(1회)하고 200을 반환한다', async () => {
        vi.mocked(getCachedJobItems).mockResolvedValue(null);
        vi.mocked(generateResponse).mockResolvedValue(fakeAiResponse('ai raw text'));
        vi.mocked(safeParseJSON).mockReturnValue({ items: validItems });
        const res = await POST(postRequest({ desiredJob: '웹 개발' }));
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json).toEqual({ success: true, items: validItems });
        expect(putCachedJobItems).toHaveBeenCalledTimes(1);
        expect(putCachedJobItems).toHaveBeenCalledWith('웹 개발', validItems);
    });

    it('AI 응답 검증에 실패하면 items:[]를 200으로 반환하고 캐시에 저장하지 않는다', async () => {
        vi.mocked(getCachedJobItems).mockResolvedValue(null);
        vi.mocked(generateResponse).mockResolvedValue(fakeAiResponse('bad'));
        vi.mocked(safeParseJSON).mockReturnValue({ items: [{ id: 'bad' }] });
        const res = await POST(postRequest({ desiredJob: '웹 개발' }));
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json).toEqual({ success: true, items: [] });
        expect(putCachedJobItems).not.toHaveBeenCalled();
    });

    it('AI 호출이 실패(예외)하면 items:[]를 200으로 반환한다', async () => {
        vi.mocked(getCachedJobItems).mockResolvedValue(null);
        vi.mocked(generateResponse).mockRejectedValue(new Error('AI 연결 실패'));
        const res = await POST(postRequest({ desiredJob: '웹 개발' }));
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json).toEqual({ success: true, items: [] });
    });
});
