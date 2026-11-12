/** GET /api/analysis/auth/kakao/callback - 카카오 인가 코드 교환 → 로그인 세션 발급 */
import crypto from 'crypto';
import { type NextRequest, NextResponse } from 'next/server';
import { apiError } from '@/lib/api-response';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { KAKAO_STATE_COOKIE, exchangeKakaoCode, fetchKakaoProfile, safeReturnTo } from '@/lib/analysis/auth/kakao';
import { upsertUser } from '@/lib/analysis/users';
import { issueUserSession } from '@/lib/analysis/auth/user-session';

export const dynamic = 'force-dynamic';

const LOGIN_PAGE = '/analysis/login';

/** state 쿠키 대조 — 타이밍 공격을 막기 위해 상수 시간으로 비교한다. */
function constantTimeEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

function redirectToLogin(request: NextRequest, error: string): NextResponse {
    const res = NextResponse.redirect(new URL(`${LOGIN_PAGE}?error=${error}`, request.url));
    res.cookies.delete(KAKAO_STATE_COOKIE);
    return res;
}

/**
 * state 쿠키 값(`${state}|${returnTo}`)을 첫 `|` 위치로만 분리한다.
 * returnTo 자체에 `|`가 들어 있어도(safeReturnTo가 허용하는 문자) 깨지지 않도록 split('|') 대신 indexOf를 쓴다.
 */
function splitStateCookie(value: string): { state: string; returnTo: string } {
    const sep = value.indexOf('|');
    return sep === -1 ? { state: value, returnTo: '' } : { state: value.slice(0, sep), returnTo: value.slice(sep + 1) };
}

export async function GET(request: NextRequest) {
    const ip = getClientIp(request);
    const burst = checkRateLimit(`analysis:kakao-callback:${ip}`, { maxRequests: 20, windowMs: 10 * 60 * 1000 });
    if (!burst.allowed) return apiError('요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.', 429);

    const { searchParams } = new URL(request.url);
    if (searchParams.get('error')) return redirectToLogin(request, 'cancelled');

    const { state: savedState, returnTo: savedReturnTo } = splitStateCookie(request.cookies.get(KAKAO_STATE_COOKIE)?.value ?? '');
    const state = searchParams.get('state') ?? '';
    // state 불일치·부재는 컨트롤러 바인딩 요구사항상 JSON 400이 아니라 로그인 페이지로 리다이렉트한다(세션 미발급).
    if (!savedState || !constantTimeEqual(savedState, state)) return redirectToLogin(request, 'state');

    const code = searchParams.get('code');
    if (!code) return redirectToLogin(request, 'kakao');

    try {
        const { accessToken } = await exchangeKakaoCode(code);
        const profile = await fetchKakaoProfile(accessToken);
        const user = await upsertUser({ provider: 'kakao', providerId: profile.id, email: profile.email, consent: true });

        const res = NextResponse.redirect(new URL(safeReturnTo(savedReturnTo), request.url));
        await issueUserSession(res, user.id, request);
        res.cookies.delete(KAKAO_STATE_COOKIE);
        return res;
    } catch (error) {
        logger.error('/api/analysis/auth/kakao/callback 오류:', error);
        return redirectToLogin(request, 'kakao');
    }
}
