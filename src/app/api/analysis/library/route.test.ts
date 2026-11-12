import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/analysis/reports');
vi.mock('@/lib/analysis/auth/user-session', () => ({ getCurrentUser: vi.fn() }));
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: vi.fn(), getClientIp: vi.fn() }));

import { listLibrary } from '@/lib/analysis/reports';
import { getCurrentUser } from '@/lib/analysis/auth/user-session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { GET } from './route';

function getRequest() {
    return new NextRequest('http://localhost/api/analysis/library');
}

beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getClientIp).mockReturnValue('1.1.1.1');
    vi.mocked(checkRateLimit).mockReturnValue({ allowed: true, remaining: 59, resetAt: Date.now() + 1000 });
});

describe('GET /api/analysis/library', () => {
    it('미로그인이면 401을 반환하고 목록을 조회하지 않는다', async () => {
        vi.mocked(getCurrentUser).mockResolvedValue(null);
        const res = await GET(getRequest());
        expect(res.status).toBe(401);
        expect(listLibrary).not.toHaveBeenCalled();
    });

    it('로그인 상태면 보관함 목록을 반환한다', async () => {
        vi.mocked(getCurrentUser).mockResolvedValue({ id: 7 });
        const createdAt = new Date('2026-01-01T00:00:00.000Z');
        vi.mocked(listLibrary).mockResolvedValue([
            { id: 1, public_id: 'pub-1', type: 'job', keyword: '백엔드 개발자', scope: 'kr', created_at: createdAt, request_count: 1 },
        ]);

        const res = await GET(getRequest());
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json).toEqual({
            success: true,
            items: [{ publicId: 'pub-1', type: 'job', keyword: '백엔드 개발자', createdAt: createdAt.toISOString() }],
        });
        expect(listLibrary).toHaveBeenCalledWith(7);
    });

    it('DB 조회 중 예외가 발생하면 500이고 내부 정보를 노출하지 않는다', async () => {
        vi.mocked(getCurrentUser).mockResolvedValue({ id: 7 });
        vi.mocked(listLibrary).mockRejectedValue(new Error('ECONNRESET at mssql connection pool'));
        const res = await GET(getRequest());
        expect(res.status).toBe(500);
        const json = await res.json();
        expect(JSON.stringify(json)).not.toContain('ECONNRESET');
    });

    it('rate limit에 걸리면 429를 반환하고 로그인 여부를 확인하지 않는다', async () => {
        vi.mocked(checkRateLimit).mockReturnValue({ allowed: false, remaining: 0, resetAt: Date.now() + 1000 });
        const res = await GET(getRequest());
        expect(res.status).toBe(429);
        expect(getCurrentUser).not.toHaveBeenCalled();
    });
});
