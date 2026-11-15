/** POST /api/analysis/auth/login - 이메일/비밀번호 로그인(계정 열거 방지: 계정 없음·오답·잠금 모두 같은 401) */
import { type NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-response';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { formatZodError } from '@/lib/validations';
import { logger } from '@/lib/logger';
import { loginSchema } from '@/lib/analysis/auth/local-schema';
import { DUMMY_HASH, isLocked, verifyPassword } from '@/lib/analysis/auth/local';
import { findLocalUserByEmail, recordLoginFailure, recordLoginSuccess } from '@/lib/analysis/users';
import { issueUserSession } from '@/lib/analysis/auth/user-session';

export const dynamic = 'force-dynamic';

const INVALID_MSG = '이메일 또는 비밀번호가 올바르지 않습니다.';

export async function POST(request: NextRequest) {
    const ip = getClientIp(request);
    const burst = checkRateLimit(`user-login:${ip}`, { maxRequests: 10, windowMs: 15 * 60 * 1000 });
    if (!burst.allowed) return apiError('요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.', 429);

    let body: unknown;
    try { body = await request.json(); } catch { return apiError('잘못된 요청입니다.', 400); }
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) return apiError(formatZodError(parsed.error), 400);

    try {
        const user = await findLocalUserByEmail(parsed.data.email);
        const locked = user !== null && isLocked(user.locked_until, new Date());

        // 계정 없음·해시 없음(카카오 등)·잠금 중은 모두 동일한 401로 응답한다(계정 열거 방지).
        // 잠금 중에는 recordLoginFailure를 호출하지 않아 잠금을 연장시키지 않는다. 응답 시간을 맞추기 위해
        // 더미 해시로 1회 비교한다.
        if (!user || !user.password_hash || locked) {
            await verifyPassword(parsed.data.password, DUMMY_HASH);
            return apiError(INVALID_MSG, 401);
        }

        const valid = await verifyPassword(parsed.data.password, user.password_hash);
        if (!valid) {
            await recordLoginFailure(user.id);
            return apiError(INVALID_MSG, 401);
        }

        await recordLoginSuccess(user.id);
        const res = apiSuccess({
            user: { id: user.id, provider: user.provider, email: user.email, mustChangePassword: user.must_change_password },
        });
        await issueUserSession(res, user.id, request);
        return res;
    } catch (error) {
        logger.error('/api/analysis/auth/login 오류:', error);
        return apiError('로그인 처리에 실패했습니다.', 500);
    }
}
