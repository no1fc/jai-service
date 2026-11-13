/**
 * 보관함 화면의 판단 로직(순수 함수) — vitest로 검증한다.
 */

export type MeState = { kind: 'loading' } | { kind: 'guest' } | { kind: 'user' };

/** `/api/analysis/me` 응답(요청 성공 여부·user 필드)을 보관함 화면의 로그인 상태로 바꾼다. */
export function resolveMeState(ok: boolean, user: unknown): MeState {
    if (!ok) return { kind: 'guest' };
    return user ? { kind: 'user' } : { kind: 'guest' };
}
