/** GET /api/analysis/auth/kakao - 카카오 로그인 시작: state 발급 후 카카오 인가 서버로 리다이렉트 */
import { type NextRequest, NextResponse } from 'next/server';
import { apiError } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { KAKAO_STATE_COOKIE, buildKakaoAuthorizeUrl, isKakaoConfigured, safeReturnTo } from '@/lib/analysis/auth/kakao';

export const dynamic = 'force-dynamic';

const STATE_COOKIE_MAX_AGE_SEC = 10 * 60; // 10분

export async function GET(request: NextRequest) {
    try {
        if (!(await isKakaoConfigured())) return apiError('카카오 로그인이 설정되지 않았습니다.', 503);

        const { searchParams } = new URL(request.url);
        if (searchParams.get('consent') !== '1') return apiError('개인정보 수집·이용 동의가 필요합니다.', 400);

        const state = crypto.randomUUID();
        const returnTo = safeReturnTo(searchParams.get('returnTo'));
        const authorizeUrl = await buildKakaoAuthorizeUrl({ state });

        const res = NextResponse.redirect(authorizeUrl);
        res.cookies.set({
            name: KAKAO_STATE_COOKIE,
            value: `${state}|${returnTo}`,
            httpOnly: true,
            sameSite: 'lax',
            path: '/',
            maxAge: STATE_COOKIE_MAX_AGE_SEC,
        });
        return res;
    } catch (error) {
        logger.error('/api/analysis/auth/kakao 오류:', error);
        return apiError('카카오 로그인을 시작할 수 없습니다.', 503);
    }
}
