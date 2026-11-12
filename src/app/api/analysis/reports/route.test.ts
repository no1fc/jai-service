import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/analysis/generate');
vi.mock('@/lib/analysis/auth/user-session');
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: vi.fn(), getClientIp: vi.fn() }));

import { generateAnalysis } from '@/lib/analysis/generate';
import { actorFromRequest } from '@/lib/analysis/auth/user-session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { POST } from './route';

const validBody = { type: 'job', keyword: '핀테크 PM', scope: 'kr', includeCompetitors: false, includeTrends: false };

function postRequest(body: unknown) {
    return new NextRequest('http://localhost/api/analysis/reports', {
        method: 'POST',
        body: typeof body === 'string' ? body : JSON.stringify(body),
        headers: { 'content-type': 'application/json' },
    });
}

beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(actorFromRequest).mockResolvedValue({ kind: 'anon' });
    vi.mocked(getClientIp).mockReturnValue('1.1.1.1');
    vi.mocked(checkRateLimit).mockReturnValue({ allowed: true, remaining: 9, resetAt: Date.now() + 1000 });
});

describe('POST /api/analysis/reports', () => {
    it('rate limit에 걸리면 429를 반환하고 generateAnalysis를 호출하지 않는다', async () => {
        vi.mocked(checkRateLimit).mockReturnValue({ allowed: false, remaining: 0, resetAt: Date.now() + 1000 });
        const res = await POST(postRequest(validBody));
        expect(res.status).toBe(429);
        expect(generateAnalysis).not.toHaveBeenCalled();
    });

    it('본문 JSON이 깨지면 400을 반환한다', async () => {
        const res = await POST(postRequest('{broken'));
        expect(res.status).toBe(400);
    });

    it('키워드가 1자면 400을 반환한다', async () => {
        const res = await POST(postRequest({ ...validBody, keyword: 'a' }));
        expect(res.status).toBe(400);
        expect(generateAnalysis).not.toHaveBeenCalled();
    });

    it('generateAnalysis가 429를 반환하면 Retry-After 헤더를 포함한다', async () => {
        vi.mocked(generateAnalysis).mockResolvedValue({ ok: false, status: 429, error: '한도 초과', retryAfterSec: 60 });
        const res = await POST(postRequest(validBody));
        expect(res.status).toBe(429);
        expect(res.headers.get('Retry-After')).toBe('60');
    });

    it('성공(캐시 미스)이면 201과 cached:false를 반환한다', async () => {
        const report = { publicId: 'uuid' };
        vi.mocked(generateAnalysis).mockResolvedValue({ ok: true, report: report as never, cached: false });
        const res = await POST(postRequest(validBody));
        expect(res.status).toBe(201);
        const json = await res.json();
        expect(json).toEqual({ success: true, report, cached: false });
    });

    it('성공(캐시 적중)이면 200과 cached:true를 반환한다', async () => {
        const report = { publicId: 'uuid' };
        vi.mocked(generateAnalysis).mockResolvedValue({ ok: true, report: report as never, cached: true });
        const res = await POST(postRequest(validBody));
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json).toEqual({ success: true, report, cached: true });
    });
});
