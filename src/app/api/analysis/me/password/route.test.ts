import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/analysis/users', () => ({
    getUserById: vi.fn(),
    findLocalUserByEmail: vi.fn(),
    updatePassword: vi.fn(),
}));
vi.mock('@/lib/analysis/auth/local', async () => {
    const actual = await vi.importActual<typeof import('@/lib/analysis/auth/local')>('@/lib/analysis/auth/local');
    return { ...actual, verifyPassword: vi.fn(), hashPassword: vi.fn() };
});
vi.mock('@/lib/analysis/auth/user-session', () => ({ getCurrentUser: vi.fn() }));
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: vi.fn(), getClientIp: vi.fn() }));

import { findLocalUserByEmail, getUserById, updatePassword } from '@/lib/analysis/users';
import { hashPassword, verifyPassword } from '@/lib/analysis/auth/local';
import { getCurrentUser } from '@/lib/analysis/auth/user-session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { PUT } from './route';

const validBody = { currentPassword: 'abcd1234', newPassword: 'xyz98765' };

function req(body: unknown) {
    return new NextRequest('http://localhost/api/analysis/me/password', {
        method: 'PUT',
        body: typeof body === 'string' ? body : JSON.stringify(body),
        headers: { 'content-type': 'application/json' },
    });
}

beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getClientIp).mockReturnValue('1.1.1.1');
    vi.mocked(checkRateLimit).mockReturnValue({ allowed: true, remaining: 9, resetAt: Date.now() + 1000 });
});

describe('PUT /api/analysis/me/password', () => {
    it('rate limit에 걸리면 429를 반환한다', async () => {
        vi.mocked(checkRateLimit).mockReturnValue({ allowed: false, remaining: 0, resetAt: Date.now() + 1000 });
        const res = await PUT(req(validBody));
        expect(res.status).toBe(429);
        expect(getCurrentUser).not.toHaveBeenCalled();
    });

    it('로그인하지 않으면 401을 반환한다', async () => {
        vi.mocked(getCurrentUser).mockResolvedValue(null);
        const res = await PUT(req(validBody));
        expect(res.status).toBe(401);
    });

    it('현재·새 비밀번호가 같으면(스키마 위반) 400을 반환한다', async () => {
        vi.mocked(getCurrentUser).mockResolvedValue({ id: 7 });
        const res = await PUT(req({ currentPassword: 'abcd1234', newPassword: 'abcd1234' }));
        expect(res.status).toBe(400);
        expect(getUserById).not.toHaveBeenCalled();
    });

    it('카카오 계정이면 400 "이메일 계정만 변경할 수 있습니다."를 반환한다', async () => {
        vi.mocked(getCurrentUser).mockResolvedValue({ id: 7 });
        vi.mocked(getUserById).mockResolvedValue({ id: 7, provider: 'kakao', provider_id: '1', email: null } as never);
        const res = await PUT(req(validBody));
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json).toEqual({ success: false, error: '이메일 계정만 변경할 수 있습니다.' });
        expect(updatePassword).not.toHaveBeenCalled();
    });

    it('현재 비밀번호가 틀리면 400 "현재 비밀번호가 올바르지 않습니다."를 반환한다', async () => {
        vi.mocked(getCurrentUser).mockResolvedValue({ id: 7 });
        vi.mocked(getUserById).mockResolvedValue({ id: 7, provider: 'local', provider_id: 'foo@bar.com', email: 'foo@bar.com' } as never);
        vi.mocked(findLocalUserByEmail).mockResolvedValue({ password_hash: 'HASH' } as never);
        vi.mocked(verifyPassword).mockResolvedValue(false);
        const res = await PUT(req(validBody));
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json).toEqual({ success: false, error: '현재 비밀번호가 올바르지 않습니다.' });
        expect(updatePassword).not.toHaveBeenCalled();
    });

    it('성공하면 updatePassword(id, hash, false)를 호출하고 200 {}을 반환한다', async () => {
        vi.mocked(getCurrentUser).mockResolvedValue({ id: 7 });
        vi.mocked(getUserById).mockResolvedValue({ id: 7, provider: 'local', provider_id: 'foo@bar.com', email: 'foo@bar.com' } as never);
        vi.mocked(findLocalUserByEmail).mockResolvedValue({ password_hash: 'HASH' } as never);
        vi.mocked(verifyPassword).mockResolvedValue(true);
        vi.mocked(hashPassword).mockResolvedValue('NEWHASH');
        const res = await PUT(req(validBody));
        expect(res.status).toBe(200);
        expect(updatePassword).toHaveBeenCalledWith(7, 'NEWHASH', false);
        const json = await res.json();
        expect(json).toEqual({ success: true });
    });
});
