/** POST /api/analysis/auth/phone/send - 휴대폰 인증번호 발송 */
import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { apiError, apiSuccess } from '@/lib/api-response';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { CODE_TTL_SEC, PHONE_DAILY_MAX, RESEND_INTERVAL_SEC, generateCode, hashCode, kstDayStartUtc, maskPhone, phoneSchema, smsMessage } from '@/lib/analysis/auth/phone';
import { deleteVerification, insertVerificationIfAllowed } from '@/lib/analysis/auth/phone-store';
import { SmsNotConfiguredError, sendSms } from '@/lib/analysis/auth/sms';

export const dynamic = 'force-dynamic';

const sendSchema = z.object({
    phone: phoneSchema,
    consent: z.literal(true),
    ageConfirmed: z.literal(true),
});

/**
 * SQL Server 데드락(오류 1205)인지 판별한다. `insertVerificationIfAllowed`의 `WITH (UPDLOCK, HOLDLOCK)` 키-범위
 * 락은 동시 요청을 블로킹해 순서대로 처리하지만, 서로 다른 번호에 걸린 락이 교차로 서로를 기다리면 데드락이
 * 날 수 있다 — SQL Server가 둘 중 하나를 희생자로 골라 1205로 끝내므로, 여기서는 그 요청에게만 재시도를
 * 안내한다(mssql 드라이버는 SQL Server 오류 번호를 던진 에러의 `.number`에 담는다).
 */
function isDeadlockError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && (error as { number?: unknown }).number === 1205;
}

export async function POST(request: NextRequest) {
    const ip = getClientIp(request);
    const burst = checkRateLimit(`analysis:phone-send:${ip}`, { maxRequests: 10, windowMs: 60 * 60 * 1000 });
    if (!burst.allowed) return apiError('요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.', 429);

    const body = await request.json().catch(() => null);
    const parsed = sendSchema.safeParse(body);
    if (!parsed.success) return apiError('입력값이 올바르지 않습니다.', 400);
    const { phone } = parsed.data;

    try {
        // 번호 가입 여부는 조회하지 않는다 — 신규/기존 모두 같은 흐름·같은 응답.
        // 재발송 간격·일일 한도 판정과 삽입을 한 SQL 문장으로 원자 처리한다(레이스로 한도를 넘기는 것을 방지).
        const code = generateCode();
        let inserted: { id: number } | null;
        try {
            inserted = await insertVerificationIfAllowed(
                phone,
                hashCode(phone, code),
                CODE_TTL_SEC,
                RESEND_INTERVAL_SEC,
                PHONE_DAILY_MAX,
                kstDayStartUtc(new Date()),
            );
        } catch (error) {
            if (isDeadlockError(error)) return apiError('잠시 후 다시 시도해 주세요.', 429);
            throw error;
        }
        if (!inserted) return apiError('잠시 후 다시 시도해 주세요.', 429);

        try {
            await sendSms(phone, smsMessage(code));
        } catch (smsError) {
            // 발송 실패 시 방금 소진한 발송 한도를 되돌린다 — 삭제 실패는 로그만 남기고 응답에는 영향 없음.
            await deleteVerification(inserted.id).catch((delError) => {
                logger.error(`[phone-send] 발송 실패 후 행 삭제 실패(id=${inserted.id}, phone=${maskPhone(phone)}):`, delError);
            });
            if (smsError instanceof SmsNotConfiguredError) return apiError('문자 발송이 설정되지 않았습니다.', 503);
            throw smsError;
        }

        return apiSuccess({ expiresInSec: CODE_TTL_SEC });
    } catch (error) {
        logger.error('/api/analysis/auth/phone/send 오류:', error);
        return apiError('문자 발송에 실패했습니다.', 500);
    }
}
