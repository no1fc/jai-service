import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/db', () => ({ getSetting: vi.fn() }));
import { getSetting } from '@/lib/db';
import { buildKakaoAuthorizeUrl, exchangeKakaoCode, fetchKakaoProfile, isKakaoConfigured, safeReturnTo } from './kakao';

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

    // 보안 리뷰 지적 사항: 아래 우회 시도는 모두 /analysis 하위 경로가 아니므로 기본값으로 떨어져야 한다.
    it('백슬래시·인코딩·경로 탈출 우회 시도를 모두 거부한다', () => {
        expect(safeReturnTo('/\\evil.com')).toBe('/analysis/library');
        expect(safeReturnTo('/%2F%2Fevil.com')).toBe('/analysis/library'); // 디코드하면 //evil.com
        expect(safeReturnTo('/%5Cevil.com')).toBe('/analysis/library'); // 디코드하면 /\evil.com
        expect(safeReturnTo('/analysis\\evil')).toBe('/analysis/library');
        expect(safeReturnTo('/analysisX')).toBe('/analysis/library'); // prefix만 같고 경계가 아님
        expect(safeReturnTo('/analysis/\tfoo')).toBe('/analysis/library'); // 탭
        expect(safeReturnTo('/analysis/ foo')).toBe('/analysis/library'); // 공백
        expect(safeReturnTo('/analysis/\nfoo')).toBe('/analysis/library'); // 개행
        expect(safeReturnTo('/analysis/../admin')).toBe('/analysis/library'); // 경로 탈출
        expect(safeReturnTo('/analysis/%2e%2e/admin')).toBe('/analysis/library'); // 인코딩된 경로 탈출
    });

    // 재리뷰 지적: 디코드를 한 번만 하면 %252e%252e(이중 인코딩)가 검사를 통과해
    // 이후 new URL()에서 /admin으로 정규화될 수 있다. URL 정규화 방식으로 차단한다.
    it('이중 인코딩된 경로 탈출(%252e%252e)을 거부한다', () => {
        expect(safeReturnTo('/analysis/%252e%252e/admin')).toBe('/analysis/library');
    });

    it('%3F처럼 의미가 바뀌는 인코딩은 디코드하지 않고 원형을 유지한다', () => {
        expect(safeReturnTo('/analysis/r/a%3Fb')).toBe('/analysis/r/a%3Fb');
    });

    it('쿼리·해시가 있으면 그대로 유지한다', () => {
        expect(safeReturnTo('/analysis/r/x?tab=1#top')).toBe('/analysis/r/x?tab=1#top');
    });
});

describe('exchangeKakaoCode', () => {
    beforeEach(() => vi.mocked(getSetting).mockImplementation(async (k: string) => settings[k] ?? 'client-secret'));
    afterEach(() => vi.unstubAllGlobals());
    it('토큰 서버가 실패 응답을 주면 throw', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('err', { status: 400 })));
        await expect(exchangeKakaoCode('code')).rejects.toThrow();
    });
    it('access_token이 없으면 throw', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({}), { status: 200 })));
        await expect(exchangeKakaoCode('code')).rejects.toThrow();
    });
});

describe('fetchKakaoProfile', () => {
    afterEach(() => vi.unstubAllGlobals());

    function mockProfileResponse(body: unknown, status = 200) {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })));
    }

    it('id는 문자열로 변환하고, kakao_account가 없으면 이메일은 null', async () => {
        mockProfileResponse({ id: 12345 });
        expect(await fetchKakaoProfile('tok')).toEqual({ id: '12345', email: null });
    });

    it('is_email_valid·is_email_verified가 모두 true일 때만 이메일을 저장한다', async () => {
        mockProfileResponse({ id: 1, kakao_account: { email: 'a@b.com', is_email_valid: true, is_email_verified: true } });
        expect(await fetchKakaoProfile('tok')).toEqual({ id: '1', email: 'a@b.com' });
    });

    it('is_email_valid가 false면 이메일은 null', async () => {
        mockProfileResponse({ id: 1, kakao_account: { email: 'a@b.com', is_email_valid: false, is_email_verified: true } });
        expect(await fetchKakaoProfile('tok')).toEqual({ id: '1', email: null });
    });

    it('is_email_verified가 false면 이메일은 null', async () => {
        mockProfileResponse({ id: 1, kakao_account: { email: 'a@b.com', is_email_valid: true, is_email_verified: false } });
        expect(await fetchKakaoProfile('tok')).toEqual({ id: '1', email: null });
    });

    it('응답이 실패 상태면 throw', async () => {
        mockProfileResponse({}, 401);
        await expect(fetchKakaoProfile('tok')).rejects.toThrow();
    });

    it('id가 없으면 throw', async () => {
        mockProfileResponse({});
        await expect(fetchKakaoProfile('tok')).rejects.toThrow();
    });
});
