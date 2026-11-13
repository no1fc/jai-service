import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('@/lib/auth', () => ({ requireRole: vi.fn() }));
vi.mock('@/lib/analysis/reports');
vi.mock('@/lib/analysis/generate');
vi.mock('@/lib/rate-limit', () => ({ getClientIp: vi.fn() }));

import { requireRole } from '@/lib/auth';
import { getReportByPublicId, listReports } from '@/lib/analysis/reports';
import { generateAnalysis } from '@/lib/analysis/generate';
import { getClientIp } from '@/lib/rate-limit';
import { GET, POST } from './route';

const validBody = { type: 'job', keyword: '핀테크 PM', scope: 'kr', includeCompetitors: false, includeTrends: false };

function getRequest(qs = '') {
    return new NextRequest(`http://localhost/api/admin/analysis/reports${qs}`);
}

function postRequest(body: unknown) {
    return new NextRequest('http://localhost/api/admin/analysis/reports', {
        method: 'POST',
        body: typeof body === 'string' ? body : JSON.stringify(body),
        headers: { 'content-type': 'application/json' },
    });
}

beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getClientIp).mockReturnValue('1.1.1.1');
});

describe('GET /api/admin/analysis/reports', () => {
    it('관리자 인증이 없으면 401을 반환한다', async () => {
        vi.mocked(requireRole).mockResolvedValue(NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 }));
        const res = await GET(getRequest());
        expect(res.status).toBe(401);
        expect(listReports).not.toHaveBeenCalled();
    });

    it('검색어가 50자를 초과하면 400을 반환한다', async () => {
        vi.mocked(requireRole).mockResolvedValue({ id: 'admin1', role: 'admin' });
        const res = await GET(getRequest(`?q=${'a'.repeat(51)}`));
        expect(res.status).toBe(400);
        expect(listReports).not.toHaveBeenCalled();
    });

    it('정상 조회 시 camelCase로 매핑된 목록을 반환한다', async () => {
        vi.mocked(requireRole).mockResolvedValue({ id: 'admin1', role: 'admin' });
        const createdAt = new Date('2026-01-01T00:00:00.000Z');
        vi.mocked(listReports).mockResolvedValue([
            { id: 1, public_id: 'pub-1', type: 'job', keyword: '핀테크 PM', scope: 'kr', created_at: createdAt, request_count: 3 },
        ]);
        const res = await GET(getRequest('?type=job&q=PM'));
        expect(res.status).toBe(200);
        expect(listReports).toHaveBeenCalledWith({ type: 'job', q: 'PM' });
        const json = await res.json();
        expect(json).toEqual({
            success: true,
            reports: [{ id: 1, publicId: 'pub-1', type: 'job', keyword: '핀테크 PM', scope: 'kr', createdAt: createdAt.toISOString(), requestCount: 3 }],
        });
    });
});

describe('POST /api/admin/analysis/reports', () => {
    it('관리자 인증이 없으면 401을 반환하고 generateAnalysis를 호출하지 않는다', async () => {
        vi.mocked(requireRole).mockResolvedValue(NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 }));
        const res = await POST(postRequest(validBody));
        expect(res.status).toBe(401);
        expect(generateAnalysis).not.toHaveBeenCalled();
    });

    it('키워드가 1자면 400을 반환한다', async () => {
        vi.mocked(requireRole).mockResolvedValue({ id: 'admin1', role: 'admin' });
        const res = await POST(postRequest({ ...validBody, keyword: 'a' }));
        expect(res.status).toBe(400);
        expect(generateAnalysis).not.toHaveBeenCalled();
    });

    it('force 값을 generateAnalysis에 그대로 전달한다', async () => {
        vi.mocked(requireRole).mockResolvedValue({ id: 'admin1', role: 'admin' });
        vi.mocked(generateAnalysis).mockResolvedValue({ ok: true, report: { publicId: 'uuid' } as never, cached: false });
        vi.mocked(getReportByPublicId).mockResolvedValue({ id: 42 } as never);

        await POST(postRequest({ ...validBody, force: true }));
        expect(generateAnalysis).toHaveBeenCalledWith(
            expect.objectContaining({ keyword: '핀테크 PM' }),
            { kind: 'admin', username: 'admin1' },
            '1.1.1.1',
            { force: true },
        );
    });

    it('generateAnalysis가 429를 반환하면 Retry-After 헤더를 포함한다', async () => {
        vi.mocked(requireRole).mockResolvedValue({ id: 'admin1', role: 'admin' });
        vi.mocked(generateAnalysis).mockResolvedValue({ ok: false, status: 429, error: '한도 초과', retryAfterSec: 60 });
        const res = await POST(postRequest(validBody));
        expect(res.status).toBe(429);
        expect(res.headers.get('Retry-After')).toBe('60');
    });

    it('성공하면 report·cached·내부 id를 반환한다', async () => {
        vi.mocked(requireRole).mockResolvedValue({ id: 'admin1', role: 'admin' });
        const report = { publicId: 'uuid' };
        vi.mocked(generateAnalysis).mockResolvedValue({ ok: true, report: report as never, cached: false });
        vi.mocked(getReportByPublicId).mockResolvedValue({ id: 42 } as never);

        const res = await POST(postRequest(validBody));
        expect(res.status).toBe(201);
        const json = await res.json();
        expect(json).toEqual({ success: true, report, cached: false, id: 42 });
    });
});
