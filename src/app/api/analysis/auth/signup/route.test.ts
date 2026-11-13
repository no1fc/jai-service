import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/analysis/users', () => ({ createLocalUser: vi.fn() }));
vi.mock('@/lib/analysis/auth/local', async () => {
    const actual = await vi.importActual<typeof import('@/lib/analysis/auth/local')>('@/lib/analysis/auth/local');
    return { ...actual, hashPassword: vi.fn() };
});
vi.mock('@/lib/analysis/auth/user-session', () => ({ issueUserSession: vi.fn() }));
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: vi.fn(), getClientIp: vi.fn() }));

import { createLocalUser } from '@/lib/analysis/users';
import { hashPassword } from '@/lib/analysis/auth/local';
import { issueUserSession } from '@/lib/analysis/auth/user-session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { POST } from './route';

const validBody = { email: 'foo@bar.com', password: 'abcd1234', consent: true, ageConfirmed: true };

function req(body: unknown) {
    return new NextRequest('http://localhost/api/analysis/auth/signup', {
        method: 'POST',
        body: typeof body === 'string' ? body : JSON.stringify(body),
        headers: { 'content-type': 'application/json' },
    });
}

beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getClientIp).mockReturnValue('1.1.1.1');
    vi.mocked(checkRateLimit).mockReturnValue({ allowed: true, remaining: 9, resetAt: Date.now() + 1000 });
    vi.mocked(hashPassword).mockResolvedValue('HASH');
});

describe('POST /api/analysis/auth/signup', () => {
    it('rate limit에 걸리면 429를 반환하고 가입을 시도하지 않는다', async () => {
        vi.mocked(checkRateLimit).mockReturnValue({ allowed: false, remaining: 0, resetAt: Date.now() + 1000 });
        const res = await POST(req(validBody));
        expect(res.status).toBe(429);
        expect(createLocalUser).not.toHaveBeenCalled();
    });

    it('동의가 없으면 400을 반환한다', async () => {
        const res = await POST(req({ ...validBody, consent: false }));
        expect(res.status).toBe(400);
        expect(createLocalUser).not.toHaveBeenCalled();
    });

    it('비밀번호 규칙 위반이면 400을 반환한다', async () => {
        const res = await POST(req({ ...validBody, password: 'short' }));
        expect(res.status).toBe(400);
        expect(createLocalUser).not.toHaveBeenCalled();
    });

    it('이메일이 중복되면 409를 반환한다', async () => {
        vi.mocked(createLocalUser).mockResolvedValue('duplicate');
        const res = await POST(req(validBody));
        expect(res.status).toBe(409);
        const json = await res.json();
        expect(json).toEqual({ success: false, error: '이미 가입된 이메일입니다.' });
        expect(issueUserSession).not.toHaveBeenCalled();
    });

    it('성공하면 201과 세션 쿠키를 반환하고 비밀번호를 응답에 포함하지 않는다', async () => {
        vi.mocked(createLocalUser).mockResolvedValue({ id: 10 });
        const res = await POST(req(validBody));
        expect(res.status).toBe(201);
        expect(createLocalUser).toHaveBeenCalledWith('foo@bar.com', 'HASH');
        expect(issueUserSession).toHaveBeenCalledWith(res, 10, expect.anything());
        const json = await res.json();
        expect(json).toEqual({ success: true, user: { id: 10, provider: 'local', email: 'foo@bar.com' } });
        expect(JSON.stringify(json)).not.toContain('abcd1234');
    });

    it('가입 처리 중 예외가 발생하면 500이고 내부 정보를 노출하지 않는다', async () => {
        vi.mocked(createLocalUser).mockRejectedValue(new Error('ECONNRESET at mssql'));
        const res = await POST(req(validBody));
        expect(res.status).toBe(500);
        const json = await res.json();
        expect(JSON.stringify(json)).not.toContain('ECONNRESET');
    });
});
