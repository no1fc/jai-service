/** POST /api/analysis/auth/phone/verify - 인증번호 확인 후 참여자 로그인 세션 발급 */
import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { apiError, apiSuccess } from '@/lib/api-response';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { MAX_ATTEMPTS, maskPhone, phoneSchema, verifyCode } from '@/lib/analysis/auth/phone';
import { incrementAttempts, latestVerification, markVerified } from '@/lib/analysis/auth/phone-store';
import { upsertUser } from '@/lib/analysis/users';
import { issueUserSession } from '@/lib/analysis/auth/user-session';

export const dynamic = 'force-dynamic';

const verifySchema = z.object({
    phone: phoneSchema,
    code: z.string().regex(/^\d{6}$/),
});

// 이력 없음·만료·불일치·사용됨·횟수 초과를 모두 같은 응답으로 묶는다 — 외부에 내부 사유를 드러내지 않는다.
// 실제 사유는 마스킹한 번호와 함께 서버 로그에만 남긴다.
const GENERIC_INVALID = '인증번호가 올바르지 않거나 만료되었습니다. 인증번호를 다시 요청해 주세요.';

function rejectVerify(phone: string, reason: string) {
    logger.warn(`[phone-verify] ${maskPhone(phone)} 거부(${reason})`);
    return apiError(GENERIC_INVALID, 400);
}

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
        if (!row) return rejectVerify(phone, 'not_found');

        // 비교 전에 시도 횟수를 원자적으로 증가시키고, DB가 반환한 실제 값만을 판정에 쓴다.
        // 로컬에서 "row.attempts + 1"을 계산해 쓰면 동시 요청이 모두 같은 낮은 값을 보게 되어
        // 사실상 무제한 코드 추측이 가능해진다 — 그래서 반드시 store의 반환값을 써야 한다.
        const attempts = await incrementAttempts(row.id, MAX_ATTEMPTS);
        if (attempts === null) return rejectVerify(phone, 'already_verified_or_missing');

        const result = verifyCode({ ...row, attempts }, phone, code, new Date());
        if (result !== 'ok') return rejectVerify(phone, result);

        // 1회용 처리도 원자적으로 — 동시 요청 중 실제로 갱신에 성공한 단 하나만 로그인시킨다.
        const verified = await markVerified(row.id);
        if (!verified) return rejectVerify(phone, 'race_already_verified');

        const user = await upsertUser({ provider: 'phone', providerId: phone, consent: true });
        const res = apiSuccess({ user });
        await issueUserSession(res, user.id, request);
        return res;
    } catch (error) {
        logger.error('/api/analysis/auth/phone/verify 오류:', error);
        return apiError('인증 처리에 실패했습니다.', 500);
    }
}
