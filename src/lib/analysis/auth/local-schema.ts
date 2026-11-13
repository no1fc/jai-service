/**
 * 자체(이메일/비밀번호) 계정의 검증 규칙·상수 — 순수 Zod 스키마만 둔다(bcrypt·crypto import 없음).
 * 클라이언트(폼 검증)와 서버(API 라우트) 양쪽에서 그대로 import할 수 있어야 한다(Task 14).
 */
import { z } from 'zod';

export const EMAIL_MAX = 100;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 64;
export const LOCK_THRESHOLD = 5;
export const LOCK_MINUTES = 15;

export const emailSchema = z.string().trim().toLowerCase().max(EMAIL_MAX)
    .regex(/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/, '이메일 형식이 올바르지 않습니다.');

// bcrypt는 비밀번호를 UTF-8 바이트로 해시하고 72바이트를 넘으면 뒷부분을 자른다(알려진 한계).
// PASSWORD_MAX(64)는 문자 수 기준이라 이모지·한글 등 멀티바이트 문자가 섞이면 72바이트를 넘을 수 있어 별도 검사한다.
const BCRYPT_MAX_BYTES = 72;

export const passwordSchema = z.string()
    .min(PASSWORD_MIN, '비밀번호는 8자 이상이어야 합니다.')
    .max(PASSWORD_MAX)
    .regex(/[a-z]/i, '영문을 포함해 주세요.')
    .regex(/\d/, '숫자를 포함해 주세요.')
    .refine(p => new TextEncoder().encode(p).length <= BCRYPT_MAX_BYTES, '비밀번호가 너무 깁니다.');

export const signupSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
    consent: z.literal(true),
    ageConfirmed: z.literal(true),
}).refine(d => d.password.toLowerCase() !== d.email, {
    message: '이메일과 같은 비밀번호는 쓸 수 없습니다.',
    path: ['password'],
});

export const loginSchema = z.object({
    email: emailSchema,
    password: z.string().min(1).max(PASSWORD_MAX),
});

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1).max(PASSWORD_MAX),
    newPassword: passwordSchema,
}).refine(d => d.currentPassword !== d.newPassword, {
    message: '현재 비밀번호와 다르게 입력해 주세요.',
    path: ['newPassword'],
});

/** 관리자 화면에 노출할 이메일 마스킹(첫 글자만 보여줌). 예: 'foo@bar.com' → 'f***@bar.com'. 빈 값·'@' 없는 값은 '***'. */
export function maskEmail(email: string): string {
    if (!email || !email.includes('@')) return '***';
    return `${email[0]}***${email.slice(email.indexOf('@'))}`;
}
