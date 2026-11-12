/** POST /api/analysis/auth/phone/verify - 인증번호 확인 후 참여자 로그인 세션 발급 */
import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { apiError, apiSuccess } from '@/lib/api-response';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { phoneSchema, verifyCode } from '@/lib/analysis/auth/phone';
import { incrementAttempts, latestVerification, markVerified } from '@/lib/analysis/auth/phone-store';
import { upsertUser } from '@/lib/analysis/users';
import { issueUserSession } from '@/lib/analysis/auth/user-session';

export const dynamic = 'force-dynamic';

const verifySchema = z.object({
    phone: phoneSchema,
    code: z.string().regex(/^\d{6}$/),
});

// mismatch·used를 구분하지 않는 일반 메시지 — 코드 재사용 여부를 외부에 드러내지 않는다.
const GENERIC_INVALID = '인증번호가 올바르지 않습니다.';

export async function POST(request: NextRequest) {
    const ip = getClientIp(request);
    const burst = checkRateLimit(`analysis:phone-verify:${ip}`, { maxRequests: 30, windowMs: 60 * 60 * 1000 });
    if (!burst.allowed) return apiError('요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.', 429);

    const body = await request.json().catch(() => null);
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) return apiError('입력값이 올바르지 않습니다.', 400);
    const { phone, code } = parsed.data;

    try {
        const row = await latestVerification(phone);
        if (!row) return apiError('인증번호를 먼저 요청해 주세요.', 400);

        // 비교 전에 먼저 시도 횟수를 증가시킨다 — 증가된 값으로 비교해야 정답이어도 초과 시 거부된다.
        await incrementAttempts(row.id);
        const result = verifyCode({ ...row, attempts: row.attempts + 1 }, phone, code, new Date());

        switch (result) {
            case 'ok': {
                await markVerified(row.id);
                const user = await upsertUser({ provider: 'phone', providerId: phone, consent: true });
                const res = apiSuccess({ user });
                await issueUserSession(res, user.id, request);
                return res;
            }
            case 'expired':
                return apiError('인증번호가 만료되었습니다.', 400);
            case 'exhausted':
                return apiError('시도 횟수를 초과했습니다. 다시 요청해 주세요.', 429);
            default:
                return apiError(GENERIC_INVALID, 400);
        }
    } catch (error) {
        logger.error('/api/analysis/auth/phone/verify 오류:', error);
        return apiError('인증 처리에 실패했습니다.', 500);
    }
}
