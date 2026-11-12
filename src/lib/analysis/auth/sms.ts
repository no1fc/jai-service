/**
 * 인증 문자 발송 어댑터.
 * `SMS_PROVIDER=sens`면 네이버 클라우드 SENS로 실제 발송, 그 외(미설정/`log`)엔 개발용 로그만 남긴다.
 * 운영(NODE_ENV=production)에서 SENS가 설정돼 있지 않으면 코드를 로그로 남기는 대신 반드시 throw한다
 * (호출부인 send 라우트가 {@link SmsNotConfiguredError}를 받아 503으로 응답한다).
 */
import { getSetting } from '@/lib/db';
import { logger } from '@/lib/logger';
import { buildSensSignature } from './sens-signature';

const SENS_BASE_URL = 'https://sens.apigw.ntruss.com';
const SENS_FETCH_TIMEOUT_MS = 5000;

/** 운영에서 SMS_PROVIDER가 미설정/log일 때 던지는 전용 에러 — 라우트가 503과 구분 처리한다. */
export class SmsNotConfiguredError extends Error {}

/** 번호를 마스킹한다(앞 3자리·뒤 4자리만 노출) — 로그에 전체 번호를 남기지 않기 위함. */
function maskPhone(phone: string): string {
    if (phone.length < 7) return '***';
    return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

/** SENS 설정 4종을 모두 조회한다. 하나라도 비어 있으면 throw(비밀값은 에러 메시지에 포함하지 않음). */
async function requireSensSettings(): Promise<{ accessKey: string; secretKey: string; serviceId: string; from: string }> {
    const [accessKey, secretKey, serviceId, from] = await Promise.all([
        getSetting('sens_access_key'),
        getSetting('sens_secret_key'),
        getSetting('sens_service_id'),
        getSetting('sens_sender'),
    ]);
    if (!accessKey || !secretKey || !serviceId || !from) {
        throw new Error('SENS 설정이 비어 있습니다. 관리자 화면(API 설정 > 외부 연동)에서 입력하세요.');
    }
    return { accessKey, secretKey, serviceId, from };
}

async function sendViaSens(to: string, text: string): Promise<void> {
    const { accessKey, secretKey, serviceId, from } = await requireSensSettings();
    const uri = `/sms/v2/services/${serviceId}/messages`;
    const timestamp = String(Date.now());
    const signature = buildSensSignature({ accessKey, secretKey, method: 'POST', uri, timestamp });

    const res = await fetch(`${SENS_BASE_URL}${uri}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'x-ncp-apigw-timestamp': timestamp,
            'x-ncp-iam-access-key': accessKey,
            'x-ncp-apigw-signature-v2': signature,
        },
        body: JSON.stringify({
            type: 'SMS',
            contentType: 'COMM',
            countryCode: '82',
            from,
            content: text,
            messages: [{ to }],
        }),
        signal: AbortSignal.timeout(SENS_FETCH_TIMEOUT_MS),
    });
    // 2xx 여부만으로 성공 판정(SENS 응답 전체 스키마는 미확인) — 상태코드만 남기고 응답 본문은 로그에 남기지 않는다.
    if (!res.ok) throw new Error(`SENS 문자 발송 실패: HTTP ${res.status}`);
}

/** 인증 문자를 발송한다. `to`는 하이픈 없는 숫자 문자열을 기대한다. */
export async function sendSms(to: string, text: string): Promise<void> {
    if (process.env.SMS_PROVIDER === 'sens') {
        await sendViaSens(to, text);
        return;
    }
    if (process.env.NODE_ENV === 'production') {
        throw new SmsNotConfiguredError('문자 발송이 설정되지 않았습니다. SMS_PROVIDER=sens로 설정하세요.');
    }
    logger.warn(`[SMS:log] ${maskPhone(to)} ${text}`);
}
