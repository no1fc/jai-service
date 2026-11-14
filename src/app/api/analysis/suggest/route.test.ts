import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: vi.fn(), getClientIp: vi.fn() }));
vi.mock('@/lib/analysis/reports', () => ({ findJobReportsByPrefix: vi.fn() }));

import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { findJobReportsByPrefix } from '@/lib/analysis/reports';
import { GET } from './route';

function getRequest(query: string) {
    return new NextRequest(`http://localhost/api/analysis/suggest${query}`);
}

beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getClientIp).mockReturnValue('1.1.1.1');
    vi.mocked(checkRateLimit).mockReturnValue({ allowed: true, remaining: 59, resetAt: Date.now() + 1000 });
    vi.mocked(findJobReportsByPrefix).mockResolvedValue([]);
});

describe('GET /api/analysis/suggest', () => {
    it('rate limit에 걸리면 429를 반환하고 findJobReportsByPrefix를 호출하지 않는다', async () => {
        vi.mocked(checkRateLimit).mockReturnValue({ allowed: false, remaining: 0, resetAt: Date.now() + 1000 });
        const res = await GET(getRequest('?type=job&q=핀테'));
        expect(res.status).toBe(429);
        expect(findJobReportsByPrefix).not.toHaveBeenCalled();
    });

    it('q가 1자면 400을 반환한다', async () => {
        const res = await GET(getRequest('?type=job&q=a'));
        expect(res.status).toBe(400);
        expect(findJobReportsByPrefix).not.toHaveBeenCalled();
    });

    it('q가 없으면 400을 반환한다', async () => {
        const res = await GET(getRequest('?type=job'));
        expect(res.status).toBe(400);
    });

    it('q가 키워드 정규식에 맞지 않으면(허용 외 문자) 400을 반환한다', async () => {
        const res = await GET(getRequest(`?type=job&q=${encodeURIComponent('핀테!!')}`));
        expect(res.status).toBe(400);
        expect(findJobReportsByPrefix).not.toHaveBeenCalled();
    });

    it('type=industry면 DB를 조회하지 않고 빈 배열을 반환한다', async () => {
        const res = await GET(getRequest('?type=industry&q=핀테크'));
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json).toEqual({ success: true, suggestions: [] });
        expect(findJobReportsByPrefix).not.toHaveBeenCalled();
    });

    it('type=job이고 q가 정상이면 findJobReportsByPrefix를 1회 호출하고 추천을 반환한다', async () => {
        vi.mocked(findJobReportsByPrefix).mockResolvedValue([{ keyword: '핀테크 PM', relatedJobs: ['프로덕트 매니저'] }]);
        const res = await GET(getRequest('?type=job&q=핀테'));
        expect(res.status).toBe(200);
        expect(findJobReportsByPrefix).toHaveBeenCalledTimes(1);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.suggestions).toContain('핀테크 PM');
    });

    it('type이 없으면(기본값 job 아님, 명시 누락) 400을 반환한다', async () => {
        const res = await GET(getRequest('?q=핀테'));
        expect(res.status).toBe(400);
    });
});
