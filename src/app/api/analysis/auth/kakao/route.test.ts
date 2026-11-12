import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// safeReturnTo·KAKAO_STATE_COOKIE는 실제 구현을 쓰고, DB/네트워크를 타는 함수만 목으로 바꾼다.
vi.mock('@/lib/analysis/auth/kakao', async () => {
    const actual = await vi.importActual<typeof import('@/lib/analysis/auth/kakao')>('@/lib/analysis/auth/kakao');
    return { ...actual, isKakaoConfigured: vi.fn(), buildKakaoAuthorizeUrl: vi.fn() };
});
vi.mock('@/lib/analysis/auth/user-session', () => ({ isSecureRequest: vi.fn() }));

import { KAKAO_STATE_COOKIE, buildKakaoAuthorizeUrl, isKakaoConfigured } from '@/lib/analysis/auth/kakao';
import { isSecureRequest } from '@/lib/analysis/auth/user-session';
import { GET } from './route';

function req(url: string) {
    return new NextRequest(url);
}

beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(isSecureRequest).mockReturnValue(false);
});

describe('GET /api/analysis/auth/kakao', () => {
    it('카카오가 설정되지 않으면 503을 반환하고 인가 URL을 만들지 않는다', async () => {
        vi.mocked(isKakaoConfigured).mockResolvedValue(false);
        const res = await GET(req('http://localhost/api/analysis/auth/kakao?consent=1'));
        expect(res.status).toBe(503);
        expect(buildKakaoAuthorizeUrl).not.toHaveBeenCalled();
    });

    it('consent=1이 아니면 400을 반환하고 인가 URL을 만들지 않는다', async () => {
        vi.mocked(isKakaoConfigured).mockResolvedValue(true);
        const res = await GET(req('http://localhost/api/analysis/auth/kakao?age=1'));
        expect(res.status).toBe(400);
        expect(buildKakaoAuthorizeUrl).not.toHaveBeenCalled();
    });

    it('age=1이 아니면 400을 반환하고 인가 URL을 만들지 않는다(14세 확인 누락)', async () => {
        vi.mocked(isKakaoConfigured).mockResolvedValue(true);
        const res = await GET(req('http://localhost/api/analysis/auth/kakao?consent=1'));
        expect(res.status).toBe(400);
        expect(buildKakaoAuthorizeUrl).not.toHaveBeenCalled();
    });

    it('성공하면 state 쿠키(httpOnly, 10분)를 설정하고 인가 URL로 리다이렉트한다', async () => {
        vi.mocked(isKakaoConfigured).mockResolvedValue(true);
        vi.mocked(buildKakaoAuthorizeUrl).mockResolvedValue('https://kauth.kakao.com/oauth/authorize?x=1');
        const res = await GET(req('http://localhost/api/analysis/auth/kakao?consent=1&age=1&returnTo=/analysis/library'));

        expect(res.status).toBe(307);
        expect(res.headers.get('location')).toBe('https://kauth.kakao.com/oauth/authorize?x=1');

        const cookie = res.cookies.get(KAKAO_STATE_COOKIE);
        expect(cookie?.httpOnly).toBe(true);
        expect(cookie?.sameSite).toBe('lax');
        expect(cookie?.maxAge).toBe(10 * 60);
        expect(cookie?.secure).toBe(false);
        expect(cookie?.value).toMatch(/^[0-9a-f-]{36}\|\/analysis\/library$/);
    });

    it('state 쿠키의 secure는 isSecureRequest 판정을 따른다', async () => {
        vi.mocked(isKakaoConfigured).mockResolvedValue(true);
        vi.mocked(buildKakaoAuthorizeUrl).mockResolvedValue('https://kauth.kakao.com/oauth/authorize?x=1');
        vi.mocked(isSecureRequest).mockReturnValue(true);
        const res = await GET(req('https://localhost/api/analysis/auth/kakao?consent=1&age=1'));
        expect(res.cookies.get(KAKAO_STATE_COOKIE)?.secure).toBe(true);
    });

    it('안전하지 않은 returnTo는 기본값으로 대체돼 쿠키에 저장된다', async () => {
        vi.mocked(isKakaoConfigured).mockResolvedValue(true);
        vi.mocked(buildKakaoAuthorizeUrl).mockResolvedValue('https://kauth.kakao.com/oauth/authorize?x=1');
        const res = await GET(req('http://localhost/api/analysis/auth/kakao?consent=1&age=1&returnTo=https://evil.com'));
        expect(res.cookies.get(KAKAO_STATE_COOKIE)?.value).toMatch(/\|\/analysis\/library$/);
    });

    it('인가 URL 생성 중 예외가 발생하면 503을 반환한다', async () => {
        vi.mocked(isKakaoConfigured).mockResolvedValue(true);
        vi.mocked(buildKakaoAuthorizeUrl).mockRejectedValue(new Error('kakao_redirect_uri 설정이 비어 있습니다.'));
        const res = await GET(req('http://localhost/api/analysis/auth/kakao?consent=1&age=1'));
        expect(res.status).toBe(503);
    });
});
