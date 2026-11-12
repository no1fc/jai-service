import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/analysis/reports');
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: vi.fn(), getClientIp: vi.fn() }));

import { getReportByPublicId, toPublicReport } from '@/lib/analysis/reports';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { GET } from './route';

const VALID_UUID = '123e4567-e89b-12d3-a456-426655440000';

function getRequest() {
    return new NextRequest('http://localhost/api/analysis/reports/x');
}

function ctx(publicId: string) {
    return { params: Promise.resolve({ publicId }) };
}

beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getClientIp).mockReturnValue('1.1.1.1');
    vi.mocked(checkRateLimit).mockReturnValue({ allowed: true, remaining: 59, resetAt: Date.now() + 1000 });
});

describe('GET /api/analysis/reports/[publicId]', () => {
    it('UUID 형식이 아니면 404이고 DB를 호출하지 않는다', async () => {
        const res = await GET(getRequest(), ctx('not-a-uuid'));
        expect(res.status).toBe(404);
        expect(getReportByPublicId).not.toHaveBeenCalled();
    });

    it('존재하지 않으면 404를 반환한다', async () => {
        vi.mocked(getReportByPublicId).mockResolvedValue(null);
        const res = await GET(getRequest(), ctx(VALID_UUID));
        expect(res.status).toBe(404);
    });

    it('존재하면 200과 report를 반환한다', async () => {
        vi.mocked(getReportByPublicId).mockResolvedValue({ id: 1, public_id: VALID_UUID } as never);
        const report = { publicId: VALID_UUID };
        vi.mocked(toPublicReport).mockReturnValue(report as never);
        const res = await GET(getRequest(), ctx(VALID_UUID));
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json).toEqual({ success: true, report });
    });

    it('DB 조회 중 예외가 발생하면 500이고 내부 정보를 노출하지 않는다', async () => {
        vi.mocked(getReportByPublicId).mockRejectedValue(new Error('ECONNRESET at mssql connection pool'));
        const res = await GET(getRequest(), ctx(VALID_UUID));
        expect(res.status).toBe(500);
        const json = await res.json();
        expect(json.error).toBe('리포트 조회에 실패했습니다.');
        expect(JSON.stringify(json)).not.toContain('ECONNRESET');
    });

    it('rate limit에 걸리면 429를 반환하고 DB를 호출하지 않는다', async () => {
        vi.mocked(checkRateLimit).mockReturnValue({ allowed: false, remaining: 0, resetAt: Date.now() + 1000 });
        const res = await GET(getRequest(), ctx(VALID_UUID));
        expect(res.status).toBe(429);
        expect(getReportByPublicId).not.toHaveBeenCalled();
    });
});
