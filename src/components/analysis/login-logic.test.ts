/**
 * login-logic.ts 테스트 — 동의 게이팅, 콜백 에러 메시지 매핑.
 */
import { describe, expect, test } from 'vitest';
import { isAgreed, resolveCallbackErrorMessage } from './login-logic';

describe('isAgreed', () => {
    test('두 체크가 모두 true일 때만 true를 반환한다', () => {
        expect(isAgreed(true, true)).toBe(true);
        expect(isAgreed(true, false)).toBe(false);
        expect(isAgreed(false, true)).toBe(false);
        expect(isAgreed(false, false)).toBe(false);
    });
});

describe('resolveCallbackErrorMessage', () => {
    test('쿼리가 없으면 null을 반환한다', () => {
        expect(resolveCallbackErrorMessage(null)).toBeNull();
    });

    test('cancelled|kakao|state는 각각 다른 메시지를 반환한다', () => {
        const cancelled = resolveCallbackErrorMessage('cancelled');
        const kakao = resolveCallbackErrorMessage('kakao');
        const state = resolveCallbackErrorMessage('state');
        expect(cancelled).toMatch(/취소/);
        expect(kakao).toMatch(/실패/);
        expect(state).toMatch(/만료/);
        expect(new Set([cancelled, kakao, state]).size).toBe(3);
    });

    test('알 수 없는 값은 kakao와 같은 기본 메시지를 반환한다', () => {
        expect(resolveCallbackErrorMessage('unknown-code')).toBe(resolveCallbackErrorMessage('kakao'));
    });
});
