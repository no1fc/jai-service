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

export async function GET(request: NextRequest) {
    const ip = getClientIp(request);
    const burst = checkRateLimit(`analysis:kakao-callback:${ip}`, { maxRequests: 20, windowMs: 10 * 60 * 1000 });
    if (!burst.allowed) return apiError('요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.', 429);

    const { searchParams } = new URL(request.url);
    if (searchParams.get('error')) return redirectToLogin(request, 'cancelled');

    const [savedState, savedReturnTo] = (request.cookies.get(KAKAO_STATE_COOKIE)?.value ?? '').split('|');
    const state = searchParams.get('state') ?? '';
    if (!savedState || !constantTimeEqual(savedState, state)) {
        const res = apiError('요청이 올바르지 않습니다.', 400);
        res.cookies.delete(KAKAO_STATE_COOKIE);
        return res;
    }

    const code = searchParams.get('code');
    if (!code) return redirectToLogin(request, 'kakao');

    try {
        const { accessToken } = await exchangeKakaoCode(code);
        const profile = await fetchKakaoProfile(accessToken);
        const user = await upsertUser({ provider: 'kakao', providerId: profile.id, email: profile.email, consent: true });

        const res = NextResponse.redirect(new URL(safeReturnTo(savedReturnTo ?? null), request.url));
        await issueUserSession(res, user.id, request);
        res.cookies.delete(KAKAO_STATE_COOKIE);
        return res;
    } catch (error) {
        logger.error('/api/analysis/auth/kakao/callback 오류:', error);
        return redirectToLogin(request, 'kakao');
    }
}
