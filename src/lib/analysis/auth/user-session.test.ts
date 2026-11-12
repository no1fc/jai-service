import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

const mockGet = vi.fn();
vi.mock('next/headers', () => ({ cookies: () => Promise.resolve({ get: mockGet }) }));

import { signToken } from '@/lib/auth';
import { USER_COOKIE, actorFromRequest, clearUserSession, getCurrentUser, issueUserSession } from './user-session';

beforeEach(() => {
    vi.stubEnv('JWT_SECRET_KEY', 'test-secret-key-for-user-session');
    mockGet.mockReset();
});

describe('getCurrentUser', () => {
    it('role=user 토큰이면 사용자 id를 반환한다', async () => {
        const token = await signToken({ id: '7', role: 'user' });
        mockGet.mockReturnValue({ value: token });
        await expect(getCurrentUser()).resolves.toEqual({ id: 7 });
    });
    it('role=admin 토큰이면 null을 반환한다', async () => {
        const token = await signToken({ id: 'admin1', role: 'admin' });
        mockGet.mockReturnValue({ value: token });
        await expect(getCurrentUser()).resolves.toBeNull();
    });
    it('쿠키가 없으면 null을 반환한다', async () => {
        mockGet.mockReturnValue(undefined);
        await expect(getCurrentUser()).resolves.toBeNull();
    });
});

describe('actorFromRequest', () => {
    it('로그인 사용자면 user Actor를 반환한다', async () => {
        const token = await signToken({ id: '7', role: 'user' });
        mockGet.mockReturnValue({ value: token });
        await expect(actorFromRequest()).resolves.toEqual({ kind: 'user', userId: 7 });
    });
    it('비로그인이면 anon Actor를 반환한다', async () => {
        mockGet.mockReturnValue(undefined);
        await expect(actorFromRequest()).resolves.toEqual({ kind: 'anon' });
    });
});

describe('issueUserSession / clearUserSession', () => {
    it('발급한 쿠키를 getCurrentUser가 같은 id로 읽어온다(라운드트립)', async () => {
        const res = NextResponse.next();
        await issueUserSession(res, 7, new Request('http://localhost/api/analysis/auth/kakao/callback'));
        const cookie = res.cookies.get(USER_COOKIE);
        expect(cookie?.value).toBeTruthy();

        mockGet.mockReturnValue({ value: cookie!.value });
        await expect(getCurrentUser()).resolves.toEqual({ id: 7 });
    });
    it('httpOnly·sameSite=lax·7일 만료로 설정한다', async () => {
        const res = NextResponse.next();
        await issueUserSession(res, 1, new Request('http://localhost/api'));
        const cookie = res.cookies.get(USER_COOKIE);
        expect(cookie?.httpOnly).toBe(true);
        expect(cookie?.sameSite).toBe('lax');
        expect(cookie?.maxAge).toBe(60 * 60 * 24 * 7);
    });
    it('clearUserSession은 쿠키 값을 비우고 즉시 만료시킨다', async () => {
        const res = NextResponse.next();
        await issueUserSession(res, 1, new Request('http://localhost/api'));
        clearUserSession(res);
        const cookie = res.cookies.get(USER_COOKIE);
        expect(cookie?.value).toBe('');
        expect(cookie?.expires && new Date(cookie.expires).getTime()).toBeLessThanOrEqual(Date.now());
    });
});
