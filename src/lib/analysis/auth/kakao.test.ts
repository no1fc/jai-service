import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/db', () => ({ getSetting: vi.fn() }));
import { getSetting } from '@/lib/db';
import { buildKakaoAuthorizeUrl, fetchKakaoProfile, isKakaoConfigured, safeReturnTo } from './kakao';

const settings: Record<string, string> = { kakao_rest_api_key: 'KEY', kakao_redirect_uri: 'http://localhost:3000/cb' };

describe('buildKakaoAuthorizeUrl', () => {
    beforeEach(() => vi.mocked(getSetting).mockImplementation(async (k: string) => settings[k] ?? null));
    it('client_id·redirect_uri·response_type=code·scope=account_email·state를 넣는다', async () => {
        const u = new URL(await buildKakaoAuthorizeUrl({ state: 'st' }));
        expect(u.origin + u.pathname).toBe('https://kauth.kakao.com/oauth/authorize');
        expect(u.searchParams.get('client_id')).toBe('KEY');
        expect(u.searchParams.get('response_type')).toBe('code');
        expect(u.searchParams.get('scope')).toBe('account_email');
        expect(u.searchParams.get('state')).toBe('st');
    });
    it('키가 없으면 throw', async () => {
        vi.mocked(getSetting).mockResolvedValue(null);
        await expect(buildKakaoAuthorizeUrl({ state: 's' })).rejects.toThrow();
    });
});

describe('isKakaoConfigured', () => {
    it('kakao_rest_api_key 유무로 판단한다', async () => {
        vi.mocked(getSetting).mockResolvedValue(null);
        expect(await isKakaoConfigured()).toBe(false);
        vi.mocked(getSetting).mockResolvedValue('KEY');
        expect(await isKakaoConfigured()).toBe(true);
    });
});

describe('safeReturnTo', () => {
    it('/analysis로 시작하는 상대 경로만 허용', () => {
        expect(safeReturnTo('/analysis/r/abc')).toBe('/analysis/r/abc');
        expect(safeReturnTo('https://evil.com')).toBe('/analysis/library');
        expect(safeReturnTo('//evil.com')).toBe('/analysis/library');
        expect(safeReturnTo('/admin')).toBe('/analysis/library');
        expect(safeReturnTo(null)).toBe('/analysis/library');
    });
});

describe('fetchKakaoProfile', () => {
    afterEach(() => vi.unstubAllGlobals());
    it('id는 문자열로, 이메일 미동의면 null', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 12345, kakao_account: { email_needs_agreement: true } }), { status: 200 })));
        expect(await fetchKakaoProfile('tok')).toEqual({ id: '12345', email: null });
    });
});
