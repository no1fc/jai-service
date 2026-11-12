/** POST /api/analysis/auth/phone/send - 휴대폰 인증번호 발송 */
import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { apiError, apiSuccess } from '@/lib/api-response';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { CODE_TTL_SEC, PHONE_DAILY_MAX, RESEND_INTERVAL_SEC, generateCode, hashCode, phoneSchema, smsMessage } from '@/lib/analysis/auth/phone';
import { countSentToday, insertVerification, secondsSinceLastSend } from '@/lib/analysis/auth/phone-store';
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
        const sinceLastSend = await secondsSinceLastSend(phone);
        if (sinceLastSend < RESEND_INTERVAL_SEC) return apiError('잠시 후 다시 요청해 주세요.', 429);

        const sentToday = await countSentToday(phone);
        if (sentToday >= PHONE_DAILY_MAX) return apiError('오늘 인증 요청 한도를 넘었습니다.', 429);

        const code = generateCode();
        await insertVerification(phone, hashCode(phone, code), CODE_TTL_SEC);

        try {
            await sendSms(phone, smsMessage(code));
        } catch (smsError) {
            if (smsError instanceof SmsNotConfiguredError) return apiError('문자 발송이 설정되지 않았습니다.', 503);
            throw smsError;
        }

        return apiSuccess({ expiresInSec: CODE_TTL_SEC });
    } catch (error) {
        logger.error('/api/analysis/auth/phone/send 오류:', error);
        return apiError('문자 발송에 실패했습니다.', 500);
    }
}
