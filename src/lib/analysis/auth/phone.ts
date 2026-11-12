/**
 * 휴대폰 문자 인증 — 순수 로직(검증 규칙·코드 생성·해시). DB·네트워크 접근은 phone-store.ts/sms.ts가 담당한다.
 */
import crypto from 'crypto';
import { z } from 'zod';

/** 인증 코드 유효 시간(초). */
export const CODE_TTL_SEC = 180;
/** 코드 1건당 허용 확인 시도 횟수. 이 값에 도달하면(증가 후) 정답 여부와 무관하게 exhausted. */
export const MAX_ATTEMPTS = 5;
/** 재발송 최소 간격(초). */
export const RESEND_INTERVAL_SEC = 60;
/** 번호당 일일 최대 발송 횟수. */
export const PHONE_DAILY_MAX = 5;

const CODE_DIGITS = 6;
const CODE_MAX = 10 ** CODE_DIGITS;

/** 하이픈 유무를 모두 허용하는 국내 휴대폰 번호 — 유선번호(02 등)는 거부하고 하이픈을 제거해 정규화한다. */
export const phoneSchema = z
    .string()
    .trim()
    .regex(/^01[016789]-?\d{3,4}-?\d{4}$/)
    .transform((v) => v.replace(/-/g, ''));

export type VerifyResult = 'ok' | 'expired' | 'exhausted' | 'mismatch' | 'used';

export interface VerificationRow {
    code_hash: string;
    attempts: number;
    expires_at: Date;
    verified_at: Date | null;
}

/** 암호학적으로 안전한 6자리 숫자 코드를 만든다. */
export function generateCode(): string {
    return String(crypto.randomInt(0, CODE_MAX)).padStart(CODE_DIGITS, '0');
}

/** 번호+코드를 HMAC-SHA256(JWT_SECRET_KEY)으로 해시한다 — 코드 원문은 저장하지 않는다. */
export function hashCode(phone: string, code: string): string {
    const secret = process.env.JWT_SECRET_KEY;
    if (!secret) throw new Error('JWT_SECRET_KEY 환경변수가 설정되지 않았습니다.');
    return crypto.createHmac('sha256', secret).update(`${phone}:${code}`).digest('hex');
}

/**
 * 저장된 인증 행과 입력 코드를 비교한다. 우선순위: 사용됨 → 만료 → 시도 초과 → 해시 불일치/일치.
 * 시도 횟수는 호출 전에 이미 증가된 값이어야 한다(증가 후 비교 — 정답이어도 초과 시 거부).
 * 해시 비교는 `crypto.timingSafeEqual`로 수행해 타이밍 공격을 방지한다.
 */
export function verifyCode(row: VerificationRow, phone: string, code: string, now: Date): VerifyResult {
    if (row.verified_at) return 'used';
    if (now.getTime() >= row.expires_at.getTime()) return 'expired';
    if (row.attempts >= MAX_ATTEMPTS) return 'exhausted';

    const expected = Buffer.from(hashCode(phone, code), 'hex');
    const actual = Buffer.from(row.code_hash, 'hex');
    if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return 'mismatch';
    return 'ok';
}

/** 문자 본문 — SENS/로그 양쪽에서 공통으로 쓴다. */
export function smsMessage(code: string): string {
    return `[J.AI] 인증번호 ${code} (3분 내 입력)`;
}
