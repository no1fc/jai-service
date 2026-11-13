import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/analysis/reports');
vi.mock('@/lib/analysis/auth/user-session', () => ({ getCurrentUser: vi.fn() }));
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: vi.fn(), getClientIp: vi.fn() }));

import { removeFromLibrary } from '@/lib/analysis/reports';
import { getCurrentUser } from '@/lib/analysis/auth/user-session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { DELETE } from './route';

const VALID_UUID = '123e4567-e89b-12d3-a456-426655440000';

function deleteRequest() {
    return new NextRequest('http://localhost/api/analysis/library/x', { method: 'DELETE' });
}

function ctx(publicId: string) {
    return { params: Promise.resolve({ publicId }) };
}

beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getClientIp).mockReturnValue('1.1.1.1');
    vi.mocked(checkRateLimit).mockReturnValue({ allowed: true, remaining: 29, resetAt: Date.now() + 1000 });
});

describe('DELETE /api/analysis/library/[publicId]', () => {
    it('미로그인이면 401을 반환하고 삭제하지 않는다', async () => {
        vi.mocked(getCurrentUser).mockResolvedValue(null);
        const res = await DELETE(deleteRequest(), ctx(VALID_UUID));
        expect(res.status).toBe(401);
        expect(removeFromLibrary).not.toHaveBeenCalled();
    });

    it('publicId가 UUID 형식이 아니면 404이고 삭제하지 않는다', async () => {
        vi.mocked(getCurrentUser).mockResolvedValue({ id: 7 });
        const res = await DELETE(deleteRequest(), ctx('not-a-uuid'));
        expect(res.status).toBe(404);
        expect(removeFromLibrary).not.toHaveBeenCalled();
    });

    it('로그인 상태 + 유효한 publicId면 삭제하고 200을 반환한다', async () => {
        vi.mocked(getCurrentUser).mockResolvedValue({ id: 7 });
        vi.mocked(removeFromLibrary).mockResolvedValue(undefined);
        const res = await DELETE(deleteRequest(), ctx(VALID_UUID));
        expect(res.status).toBe(200);
        expect(removeFromLibrary).toHaveBeenCalledWith(7, VALID_UUID);
    });

    it('삭제 중 예외가 발생하면 500이고 내부 정보를 노출하지 않는다', async () => {
        vi.mocked(getCurrentUser).mockResolvedValue({ id: 7 });
        vi.mocked(removeFromLibrary).mockRejectedValue(new Error('ECONNRESET at mssql connection pool'));
        const res = await DELETE(deleteRequest(), ctx(VALID_UUID));
        expect(res.status).toBe(500);
        const json = await res.json();
        expect(JSON.stringify(json)).not.toContain('ECONNRESET');
    });

    it('rate limit에 걸리면 429를 반환하고 로그인 여부를 확인하지 않는다', async () => {
        vi.mocked(checkRateLimit).mockReturnValue({ allowed: false, remaining: 0, resetAt: Date.now() + 1000 });
        const res = await DELETE(deleteRequest(), ctx(VALID_UUID));
        expect(res.status).toBe(429);
        expect(getCurrentUser).not.toHaveBeenCalled();
    });
});
