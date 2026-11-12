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

/**
 * `/analysis`로 시작하는 상대 경로만 허용한다(오픈 리다이렉트·경로 탈출·이중 인코딩 우회 방지).
 * 문자열 매칭(한 번만 디코드) 대신 WHATWG `URL`로 정규화해 검증한다 — `%2e%2e`(인코딩된 "..")는
 * `URL`이 실제 브라우저/Node의 리다이렉트 처리와 동일한 규칙으로 `..`와 똑같이 접기 때문에,
 * 문자열 비교보다 안전하다. 통과하면 원래 인코딩을 보존한 `pathname + search + hash`를 반환한다
 * (예: `%3F`를 `?`로 디코드해 의미를 바꾸지 않는다).
 */
export function safeReturnTo(raw: string | null): string {
    if (!raw) return DEFAULT_RETURN;
    // `/\`는 특수 스킴에서 `/`와 동일하게 취급돼 `//evil.com`과 같은 효과를 내므로 시작부터 차단한다.
    // 백슬래시는 경로 중간에 있어도 URL 파서가 `/`로 바꿔버려 의도를 알 수 없으므로 전체를 거부한다.
    if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\') || raw.includes('\\')) return DEFAULT_RETURN;
    if (/[\s\x00-\x1f\x7f]/.test(raw)) return DEFAULT_RETURN;

    let u: URL;
    try {
        u = new URL(raw, 'http://x');
    } catch {
        return DEFAULT_RETURN;
    }
    if (u.origin !== 'http://x') return DEFAULT_RETURN;
    if (u.pathname !== '/analysis' && !u.pathname.startsWith('/analysis/')) return DEFAULT_RETURN;

    // 이중 인코딩 잔재 거부: `%252e%252e`는 1차 정규화로는 접히지 않고 그대로 남으므로,
    // pathname을 한 번 더 디코드해 `%2e`/`%5c`가 남아 있으면(=2단 인코딩이었으면) 거부한다.
    let decodedOnceMore: string;
    try {
        decodedOnceMore = decodeURIComponent(u.pathname);
    } catch {
        return DEFAULT_RETURN;
    }
    if (/%2e|%5c/i.test(decodedOnceMore)) return DEFAULT_RETURN;

    return u.pathname + u.search + u.hash;
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

/**
 * 카카오 사용자 정보를 조회한다. `is_email_valid`·`is_email_verified`가 모두 true일 때만 이메일을 반환하고,
 * 그 외(미동의·미검증 포함)에는 null로 둔다. 전화번호는 수집하지 않는다.
 */
export async function fetchKakaoProfile(accessToken: string): Promise<{ id: string; email: string | null }> {
    const res = await fetch(ME_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`카카오 사용자 조회 실패: HTTP ${res.status}`);
    const json = await res.json() as {
        id?: number | string;
        kakao_account?: { email?: string; is_email_valid?: boolean; is_email_verified?: boolean };
    };
    if (json.id === undefined) throw new Error('카카오 응답에 id 없음');
    const account = json.kakao_account;
    const isEmailTrusted = account?.is_email_valid === true && account?.is_email_verified === true;
    return { id: String(json.id), email: isEmailTrusted ? (account?.email ?? null) : null };
}
