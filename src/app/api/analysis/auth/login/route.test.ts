import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/analysis/users', () => ({
    findLocalUserByEmail: vi.fn(),
    recordLoginFailure: vi.fn(),
    recordLoginSuccess: vi.fn(),
}));
vi.mock('@/lib/analysis/auth/local', async () => {
    const actual = await vi.importActual<typeof import('@/lib/analysis/auth/local')>('@/lib/analysis/auth/local');
    return { ...actual, verifyPassword: vi.fn() };
});
vi.mock('@/lib/analysis/auth/user-session', () => ({ issueUserSession: vi.fn() }));
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: vi.fn(), getClientIp: vi.fn() }));

import { findLocalUserByEmail, recordLoginFailure, recordLoginSuccess } from '@/lib/analysis/users';
import { DUMMY_HASH, verifyPassword } from '@/lib/analysis/auth/local';
import { issueUserSession } from '@/lib/analysis/auth/user-session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { POST } from './route';

const INVALID_MSG = '이메일 또는 비밀번호가 올바르지 않습니다.';
const validBody = { email: 'foo@bar.com', password: 'abcd1234' };

function req(body: unknown) {
    return new NextRequest('http://localhost/api/analysis/auth/login', {
        method: 'POST',
        body: typeof body === 'string' ? body : JSON.stringify(body),
        headers: { 'content-type': 'application/json' },
    });
}

function localUser(overrides: Partial<Record<string, unknown>> = {}) {
    return {
        id: 7,
        provider: 'local',
        provider_id: 'foo@bar.com',
        email: 'foo@bar.com',
        must_change_password: false,
        password_hash: 'HASH',
        failed_attempts: 0,
        locked_until: null,
        ...overrides,
    } as never;
}

beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getClientIp).mockReturnValue('1.1.1.1');
    vi.mocked(checkRateLimit).mockReturnValue({ allowed: true, remaining: 9, resetAt: Date.now() + 1000 });
});

describe('POST /api/analysis/auth/login', () => {
    it('rate limit에 걸리면 429를 반환한다', async () => {
        vi.mocked(checkRateLimit).mockReturnValue({ allowed: false, remaining: 0, resetAt: Date.now() + 1000 });
        const res = await POST(req(validBody));
        expect(res.status).toBe(429);
        expect(findLocalUserByEmail).not.toHaveBeenCalled();
    });

    it('계정이 없으면 401 동일 문구를 반환하고 더미 해시로 1회 비교한다', async () => {
        vi.mocked(findLocalUserByEmail).mockResolvedValue(null);
        const res = await POST(req(validBody));
        expect(res.status).toBe(401);
        const json = await res.json();
        expect(json).toEqual({ success: false, error: INVALID_MSG });
        expect(verifyPassword).toHaveBeenCalledTimes(1);
        expect(verifyPassword).toHaveBeenCalledWith('abcd1234', DUMMY_HASH);
        expect(recordLoginFailure).not.toHaveBeenCalled();
    });

    it('password_hash가 없으면(가드) 401 동일 문구를 반환하고 더미 해시로 비교한다', async () => {
        vi.mocked(findLocalUserByEmail).mockResolvedValue(localUser({ password_hash: null }));
        const res = await POST(req(validBody));
        expect(res.status).toBe(401);
        expect(verifyPassword).toHaveBeenCalledWith('abcd1234', DUMMY_HASH);
        expect(recordLoginFailure).not.toHaveBeenCalled();
    });

    it('잠겨 있으면 401 동일 문구를 반환하고 recordLoginFailure를 호출하지 않는다(잠금 연장 방지)', async () => {
        const lockedUntil = new Date(Date.now() + 10 * 60 * 1000);
        vi.mocked(findLocalUserByEmail).mockResolvedValue(localUser({ locked_until: lockedUntil }));
        const res = await POST(req(validBody));
        expect(res.status).toBe(401);
        const json = await res.json();
        expect(json).toEqual({ success: false, error: INVALID_MSG });
        expect(verifyPassword).toHaveBeenCalledTimes(1);
        expect(verifyPassword).toHaveBeenCalledWith('abcd1234', DUMMY_HASH);
        expect(recordLoginFailure).not.toHaveBeenCalled();
        expect(recordLoginSuccess).not.toHaveBeenCalled();
    });

    it('비밀번호가 틀리면 401을 반환하고 recordLoginFailure(id)를 호출한다', async () => {
        vi.mocked(findLocalUserByEmail).mockResolvedValue(localUser());
        vi.mocked(verifyPassword).mockResolvedValue(false);
        vi.mocked(recordLoginFailure).mockResolvedValue({ failedAttempts: 1, lockedUntil: null });
        const res = await POST(req(validBody));
        expect(res.status).toBe(401);
        expect(verifyPassword).toHaveBeenCalledWith('abcd1234', 'HASH');
        expect(recordLoginFailure).toHaveBeenCalledWith(7);
        expect(recordLoginSuccess).not.toHaveBeenCalled();
    });

    it('5번째 실패에서 recordLoginFailure가 lockedUntil을 반환해도 응답 문구는 동일하다', async () => {
        vi.mocked(findLocalUserByEmail).mockResolvedValue(localUser({ failed_attempts: 4 }));
        vi.mocked(verifyPassword).mockResolvedValue(false);
        vi.mocked(recordLoginFailure).mockResolvedValue({ failedAttempts: 5, lockedUntil: new Date() });
        const res = await POST(req(validBody));
        expect(res.status).toBe(401);
        const json = await res.json();
        expect(json).toEqual({ success: false, error: INVALID_MSG });
    });

    it('성공하면 recordLoginSuccess 호출·세션 발급·mustChangePassword를 포함한 user를 반환하고 해시·잠금 필드는 노출하지 않는다', async () => {
        vi.mocked(findLocalUserByEmail).mockResolvedValue(localUser({ must_change_password: true }));
        vi.mocked(verifyPassword).mockResolvedValue(true);
        const res = await POST(req(validBody));
        expect(res.status).toBe(200);
        expect(recordLoginSuccess).toHaveBeenCalledWith(7);
        expect(issueUserSession).toHaveBeenCalledWith(res, 7, expect.anything());
        const json = await res.json();
        expect(json).toEqual({
            success: true,
            user: { id: 7, provider: 'local', email: 'foo@bar.com', mustChangePassword: true },
        });
        expect(JSON.stringify(json)).not.toContain('HASH');
        expect(JSON.stringify(json)).not.toContain('locked');
    });
});
