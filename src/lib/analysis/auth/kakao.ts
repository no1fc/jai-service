/**
 * 카카오 로그인 REST API — developers.kakao.com/docs/ko/kakaologin/rest-api.
 * 자격증명은 환경변수가 아니라 system_settings(getSetting)에서 조회한다(관리자 화면 입력).
 */
import { getSetting } from '@/lib/db';

const AUTHORIZE_URL = 'https://kauth.kakao.com/oauth/authorize';
const TOKEN_URL = 'https://kauth.kakao.com/oauth/token';
const ME_URL = 'https://kapi.kakao.com/v2/user/me';
export const KAKAO_STATE_COOKIE = 'kakao_oauth_state';
const DEFAULT_RETURN = '/analysis/library';
const FETCH_TIMEOUT_MS = 5000;

const requiredSetting = async (key: string) => {
    const v = await getSetting(key);
    if (!v) throw new Error(`${key} 설정이 비어 있습니다. 관리자 화면(API 설정 > 외부 연동)에서 입력하세요.`);
    return v;
};

/** 로그인 화면이 카카오 버튼을 보여줄지 결정할 때 쓴다(키 미설정 시 숨김). */
export async function isKakaoConfigured(): Promise<boolean> {
    return Boolean(await getSetting('kakao_rest_api_key'));
}

/** 카카오 인가 서버 URL을 만든다. 자격증명이 비어 있으면 throw. */
export async function buildKakaoAuthorizeUrl({ state }: { state: string }): Promise<string> {
    const u = new URL(AUTHORIZE_URL);
    Object.entries({
        client_id: await requiredSetting('kakao_rest_api_key'),
        redirect_uri: await requiredSetting('kakao_redirect_uri'),
        response_type: 'code',
        scope: 'account_email',
        state,
    }).forEach(([k, v]) => u.searchParams.set(k, v));
    return u.toString();
}

/** `/analysis`로 시작하는 상대 경로만 허용한다(오픈 리다이렉트 방지). 그 외는 기본 경로로 대체한다. */
export function safeReturnTo(raw: string | null): string {
    return raw && /^\/analysis(\/[^\s]*)?$/.test(raw) && !raw.startsWith('//') ? raw : DEFAULT_RETURN;
}

/** 인가 코드를 액세스 토큰으로 교환한다. */
export async function exchangeKakaoCode(code: string): Promise<{ accessToken: string }> {
    const body = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: await requiredSetting('kakao_rest_api_key'),
        client_secret: await requiredSetting('kakao_client_secret'),
        redirect_uri: await requiredSetting('kakao_redirect_uri'),
        code,
    });
    const res = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
        body,
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`카카오 토큰 교환 실패: HTTP ${res.status}`);
    const json = await res.json() as { access_token?: string };
    if (!json.access_token) throw new Error('카카오 토큰 응답에 access_token 없음');
    return { accessToken: json.access_token };
}

/** 카카오 사용자 정보를 조회한다. 이메일 동의가 없으면 null. 전화번호는 수집하지 않는다. */
export async function fetchKakaoProfile(accessToken: string): Promise<{ id: string; email: string | null }> {
    const res = await fetch(ME_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`카카오 사용자 조회 실패: HTTP ${res.status}`);
    const json = await res.json() as { id?: number | string; kakao_account?: { email?: string; email_needs_agreement?: boolean } };
    if (json.id === undefined) throw new Error('카카오 응답에 id 없음');
    return { id: String(json.id), email: json.kakao_account?.email_needs_agreement ? null : (json.kakao_account?.email ?? null) };
}
