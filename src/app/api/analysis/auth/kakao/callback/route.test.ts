import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: vi.fn(), getClientIp: vi.fn() }));
// safeReturnTo·KAKAO_STATE_COOKIE는 실제 구현을 쓰고, 네트워크를 타는 함수만 목으로 바꾼다.
vi.mock('@/lib/analysis/auth/kakao', async () => {
    const actual = await vi.importActual<typeof import('@/lib/analysis/auth/kakao')>('@/lib/analysis/auth/kakao');
    return { ...actual, exchangeKakaoCode: vi.fn(), fetchKakaoProfile: vi.fn() };
});
vi.mock('@/lib/analysis/users', () => ({ upsertUser: vi.fn() }));
vi.mock('@/lib/analysis/auth/user-session', () => ({ issueUserSession: vi.fn() }));

import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { KAKAO_STATE_COOKIE, exchangeKakaoCode, fetchKakaoProfile } from '@/lib/analysis/auth/kakao';
import { upsertUser } from '@/lib/analysis/users';
import { issueUserSession } from '@/lib/analysis/auth/user-session';
import { GET } from './route';

const STATE = '11111111-1111-1111-1111-111111111111';

function req(query: string, cookieValue?: string) {
    return new NextRequest(`http://localhost/api/analysis/auth/kakao/callback${query}`, {
        headers: cookieValue ? { cookie: `${KAKAO_STATE_COOKIE}=${cookieValue}` } : undefined,
    });
}

beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getClientIp).mockReturnValue('1.1.1.1');
    vi.mocked(checkRateLimit).mockReturnValue({ allowed: true, remaining: 19, resetAt: Date.now() + 1000 });
});

describe('GET /api/analysis/auth/kakao/callback', () => {
    it('rate limit에 걸리면 429를 반환하고 세션을 발급하지 않는다', async () => {
        vi.mocked(checkRateLimit).mockReturnValue({ allowed: false, remaining: 0, resetAt: Date.now() + 1000 });
        const res = await GET(req(`?state=${STATE}&code=c`, `${STATE}|/analysis/library`));
        expect(res.status).toBe(429);
        expect(issueUserSession).not.toHaveBeenCalled();
    });

    it('error 쿼리(사용자 취소)는 로그인 페이지로 리다이렉트하고 state 쿠키를 지운다', async () => {
        const res = await GET(req(`?error=access_denied`, `${STATE}|/analysis/library`));
        expect(res.status).toBe(307);
        expect(res.headers.get('location')).toBe('http://localhost/analysis/login?error=cancelled');
        expect(res.cookies.get(KAKAO_STATE_COOKIE)?.value).toBe('');
        expect(issueUserSession).not.toHaveBeenCalled();
    });

    it('state 쿠키가 없으면 400 대신 로그인 페이지(error=state)로 리다이렉트하고 세션을 발급하지 않는다', async () => {
        const res = await GET(req(`?state=${STATE}&code=c`));
        expect(res.status).toBe(307);
        expect(res.headers.get('location')).toBe('http://localhost/analysis/login?error=state');
        expect(res.cookies.get(KAKAO_STATE_COOKIE)?.value).toBe('');
        expect(issueUserSession).not.toHaveBeenCalled();
        expect(exchangeKakaoCode).not.toHaveBeenCalled();
    });

    it('state가 쿠키와 다르면 로그인 페이지(error=state)로 리다이렉트하고 세션을 발급하지 않는다', async () => {
        const res = await GET(req(`?state=다른값&code=c`, `${STATE}|/analysis/library`));
        expect(res.status).toBe(307);
        expect(res.headers.get('location')).toBe('http://localhost/analysis/login?error=state');
        expect(res.cookies.get(KAKAO_STATE_COOKIE)?.value).toBe('');
        expect(issueUserSession).not.toHaveBeenCalled();
    });

    it('code가 없으면 로그인 페이지(error=kakao)로 리다이렉트한다', async () => {
        const res = await GET(req(`?state=${STATE}`, `${STATE}|/analysis/library`));
        expect(res.status).toBe(307);
        expect(res.headers.get('location')).toBe('http://localhost/analysis/login?error=kakao');
        expect(res.cookies.get(KAKAO_STATE_COOKIE)?.value).toBe('');
    });

    it('exchangeKakaoCode가 실패하면 로그인 페이지(error=kakao)로 리다이렉트하고 세션을 발급하지 않는다', async () => {
        vi.mocked(exchangeKakaoCode).mockRejectedValue(new Error('토큰 교환 실패'));
        const res = await GET(req(`?state=${STATE}&code=c`, `${STATE}|/analysis/library`));
        expect(res.status).toBe(307);
        expect(res.headers.get('location')).toBe('http://localhost/analysis/login?error=kakao');
        expect(res.cookies.get(KAKAO_STATE_COOKIE)?.value).toBe('');
        expect(issueUserSession).not.toHaveBeenCalled();
    });

    it('fetchKakaoProfile이 실패하면 로그인 페이지(error=kakao)로 리다이렉트한다', async () => {
        vi.mocked(exchangeKakaoCode).mockResolvedValue({ accessToken: 'tok' });
        vi.mocked(fetchKakaoProfile).mockRejectedValue(new Error('프로필 조회 실패'));
        const res = await GET(req(`?state=${STATE}&code=c`, `${STATE}|/analysis/library`));
        expect(res.status).toBe(307);
        expect(res.headers.get('location')).toBe('http://localhost/analysis/login?error=kakao');
        expect(issueUserSession).not.toHaveBeenCalled();
    });

    it('성공하면 세션을 발급하고 returnTo로 리다이렉트하며 state 쿠키를 지운다', async () => {
        vi.mocked(exchangeKakaoCode).mockResolvedValue({ accessToken: 'tok' });
        vi.mocked(fetchKakaoProfile).mockResolvedValue({ id: '999', email: null });
        vi.mocked(upsertUser).mockResolvedValue({ id: 42 });

        const res = await GET(req(`?state=${STATE}&code=c`, `${STATE}|/analysis/library`));

        expect(upsertUser).toHaveBeenCalledWith({ provider: 'kakao', providerId: '999', email: null, consent: true });
        expect(issueUserSession).toHaveBeenCalledWith(res, 42, expect.anything());
        expect(res.status).toBe(307);
        expect(res.headers.get('location')).toBe('http://localhost/analysis/library');
        expect(res.cookies.get(KAKAO_STATE_COOKIE)?.value).toBe('');
    });

    it('returnTo에 "|"가 포함돼도 첫 구분자로만 분리해 그대로 사용한다', async () => {
        vi.mocked(exchangeKakaoCode).mockResolvedValue({ accessToken: 'tok' });
        vi.mocked(fetchKakaoProfile).mockResolvedValue({ id: '1', email: null });
        vi.mocked(upsertUser).mockResolvedValue({ id: 1 });

        const res = await GET(req(`?state=${STATE}&code=c`, `${STATE}|/analysis/a|b`));
        expect(res.headers.get('location')).toBe('http://localhost/analysis/a|b');
    });

    it('안전하지 않은 returnTo는 기본 경로로 대체한다', async () => {
        vi.mocked(exchangeKakaoCode).mockResolvedValue({ accessToken: 'tok' });
        vi.mocked(fetchKakaoProfile).mockResolvedValue({ id: '1', email: null });
        vi.mocked(upsertUser).mockResolvedValue({ id: 1 });

        const res = await GET(req(`?state=${STATE}&code=c`, `${STATE}|https://evil.com`));
        expect(res.headers.get('location')).toBe('http://localhost/analysis/library');
    });
});
