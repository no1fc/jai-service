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
        const inserted = await insertVerificationIfAllowed(
            phone,
            hashCode(phone, code),
            CODE_TTL_SEC,
            RESEND_INTERVAL_SEC,
            PHONE_DAILY_MAX,
            kstDayStartUtc(new Date()),
        );
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
