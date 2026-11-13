import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/analysis/users');
vi.mock('@/lib/analysis/auth/user-session', () => ({ getCurrentUser: vi.fn(), clearUserSession: vi.fn() }));
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: vi.fn(), getClientIp: vi.fn() }));

import { deleteUser, getUserById } from '@/lib/analysis/users';
import { clearUserSession, getCurrentUser } from '@/lib/analysis/auth/user-session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { DELETE, GET } from './route';

function deleteRequest() {
    return new NextRequest('http://localhost/api/analysis/me', { method: 'DELETE' });
}

beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getClientIp).mockReturnValue('1.1.1.1');
    vi.mocked(checkRateLimit).mockReturnValue({ allowed: true, remaining: 9, resetAt: Date.now() + 1000 });
});

describe('GET /api/analysis/me', () => {
    it('비로그인이면 user: null을 반환한다', async () => {
        vi.mocked(getCurrentUser).mockResolvedValue(null);
        const res = await GET();
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json).toEqual({ success: true, user: null });
    });

    it('로그인 상태면 사용자 정보를 반환한다', async () => {
        vi.mocked(getCurrentUser).mockResolvedValue({ id: 7 });
        vi.mocked(getUserById).mockResolvedValue({ id: 7, provider: 'phone', provider_id: '01000000000', email: null } as never);
        const res = await GET();
        const json = await res.json();
        expect(json).toEqual({ success: true, user: { id: 7, provider: 'phone', email: null } });
    });
});

describe('DELETE /api/analysis/me', () => {
    it('미로그인이면 401을 반환하고 탈퇴 처리하지 않는다', async () => {
        vi.mocked(getCurrentUser).mockResolvedValue(null);
        const res = await DELETE(deleteRequest());
        expect(res.status).toBe(401);
        expect(deleteUser).not.toHaveBeenCalled();
    });

    it('로그인 상태면 deleteUser를 호출하고 세션 쿠키를 삭제한다', async () => {
        vi.mocked(getCurrentUser).mockResolvedValue({ id: 7 });
        vi.mocked(deleteUser).mockResolvedValue(true);
        const res = await DELETE(deleteRequest());
        expect(res.status).toBe(200);
        expect(deleteUser).toHaveBeenCalledWith(7);
        expect(clearUserSession).toHaveBeenCalledWith(res);
        const json = await res.json();
        expect(json).toEqual({ success: true, message: '탈퇴가 완료되었습니다.' });
    });

    it('deleteUser가 false를 반환하면(이미 탈퇴/계정 없음) 404이고 세션 쿠키는 그대로 삭제한다', async () => {
        vi.mocked(getCurrentUser).mockResolvedValue({ id: 7 });
        vi.mocked(deleteUser).mockResolvedValue(false);
        const res = await DELETE(deleteRequest());
        expect(res.status).toBe(404);
        expect(clearUserSession).toHaveBeenCalledWith(res);
        const json = await res.json();
        expect(json).toEqual({ success: false, error: '이미 탈퇴했거나 계정을 찾을 수 없습니다.' });
    });

    it('탈퇴 처리 중 예외가 발생하면 500이고 내부 정보를 노출하지 않는다', async () => {
        vi.mocked(getCurrentUser).mockResolvedValue({ id: 7 });
        vi.mocked(deleteUser).mockRejectedValue(new Error('ECONNRESET at mssql connection pool'));
        const res = await DELETE(deleteRequest());
        expect(res.status).toBe(500);
        const json = await res.json();
        expect(JSON.stringify(json)).not.toContain('ECONNRESET');
    });

    it('rate limit에 걸리면 429를 반환하고 로그인 여부를 확인하지 않는다', async () => {
        vi.mocked(checkRateLimit).mockReturnValue({ allowed: false, remaining: 0, resetAt: Date.now() + 1000 });
        const res = await DELETE(deleteRequest());
        expect(res.status).toBe(429);
        expect(getCurrentUser).not.toHaveBeenCalled();
    });
});
