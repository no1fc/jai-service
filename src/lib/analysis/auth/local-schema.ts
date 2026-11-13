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

export const passwordSchema = z.string()
    .min(PASSWORD_MIN, '비밀번호는 8자 이상이어야 합니다.')
    .max(PASSWORD_MAX)
    .regex(/[a-z]/i, '영문을 포함해 주세요.')
    .regex(/\d/, '숫자를 포함해 주세요.');

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
