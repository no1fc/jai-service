/**
 * 공개 분석 API용 참여자(user) 세션 조회·발급.
 */
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import { signToken, verifyToken } from '@/lib/auth';
import type { Actor } from '@/lib/analysis/reports';

export const USER_COOKIE = 'user_session';
const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7일

/** user_session 쿠키를 검증해 로그인한 참여자만 식별한다. 관리자 토큰·만료·부재는 null. */
export async function getCurrentUser(): Promise<{ id: number } | null> {
    const token = (await cookies()).get(USER_COOKIE)?.value;
    if (!token) return null;
    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'user') return null;
    const id = Number(payload.id);
    return Number.isNaN(id) ? null : { id };
}

/** 요청의 Actor를 판별한다 — 로그인 사용자면 user, 아니면 anon(관리자 토큰은 분석 API에서 미지원). */
export async function actorFromRequest(): Promise<Actor> {
    const user = await getCurrentUser();
    return user ? { kind: 'user', userId: user.id } : { kind: 'anon' };
}

/**
 * 요청이 HTTPS로 왔는지 판정한다(`x-forwarded-proto` 헤더 우선, 그 외 URL 스킴).
 * 기존 관리자 로그인(`/api/admin/login`)과 동일한 판정 로직 — 프로덕션 + HTTPS일 때만 secure 쿠키를 켠다.
 * 참여자 세션 쿠키와 카카오 state 쿠키가 모두 이 판정을 재사용한다.
 */
export function isSecureRequest(request: Request): boolean {
    const isHttps = request.headers.get('x-forwarded-proto') === 'https' || request.url.startsWith('https://');
    return process.env.NODE_ENV === 'production' && isHttps;
}

/** 참여자 로그인 세션 쿠키를 발급한다(7일, httpOnly, sameSite lax). secure 판정은 {@link isSecureRequest} 참고. */
export async function issueUserSession(res: NextResponse, userId: number, request: Request): Promise<void> {
    const token = await signToken({ id: String(userId), role: 'user' }, '7d');
    res.cookies.set({
        name: USER_COOKIE,
        value: token,
        httpOnly: true,
        secure: isSecureRequest(request),
        sameSite: 'lax',
        path: '/',
        maxAge: SESSION_MAX_AGE_SEC,
    });
}

/** 참여자 로그아웃 — user_session 쿠키를 삭제한다. */
export function clearUserSession(res: NextResponse): void {
    res.cookies.delete(USER_COOKIE);
}
