/**
 * 공개 분석 API용 참여자(user) 세션 조회.
 * 쿠키 발급(로그인)은 Task 7에서 구현하며, 이 모듈은 조회만 담당한다.
 */
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import type { Actor } from '@/lib/analysis/reports';

/** user_session 쿠키를 검증해 로그인한 참여자만 식별한다. 관리자 토큰·만료·부재는 null. */
export async function getCurrentUser(): Promise<{ id: number } | null> {
    const token = (await cookies()).get('user_session')?.value;
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
