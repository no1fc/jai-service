/**
 * login-logic.ts 테스트 — 동의 게이팅, 콜백 에러 메시지 매핑.
 */
import { describe, expect, test } from 'vitest';
import { canSubmitLogin, canSubmitSignup, isAgreed, passwordHint, resolveCallbackErrorMessage } from './login-logic';

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

describe('canSubmitLogin', () => {
    test('이메일 형식이 올바르고 비밀번호가 입력되어 있으면 true', () => {
        expect(canSubmitLogin('a@b.com', 'anything', false)).toBe(true);
    });

    test('로딩 중이면 false', () => {
        expect(canSubmitLogin('a@b.com', 'anything', true)).toBe(false);
    });

    test('이메일 형식이 아니면 false', () => {
        expect(canSubmitLogin('not-an-email', 'anything', false)).toBe(false);
    });

    test('비밀번호가 비어 있으면 false', () => {
        expect(canSubmitLogin('a@b.com', '', false)).toBe(false);
    });
});

describe('canSubmitSignup', () => {
    const email = 'a@b.com';
    const password = 'abc12345';

    test('동의·이메일·비밀번호 형식·확인 일치가 모두 맞으면 true', () => {
        expect(canSubmitSignup(true, email, password, password, false)).toBe(true);
    });

    test('동의하지 않으면 false', () => {
        expect(canSubmitSignup(false, email, password, password, false)).toBe(false);
    });

    test('로딩 중이면 false', () => {
        expect(canSubmitSignup(true, email, password, password, true)).toBe(false);
    });

    test('이메일 형식이 아니면 false', () => {
        expect(canSubmitSignup(true, 'not-an-email', password, password, false)).toBe(false);
    });

    test('비밀번호 형식이 아니면(영문/숫자 미포함) false', () => {
        expect(canSubmitSignup(true, email, 'onlyletters', password, false)).toBe(false);
    });

    test('비밀번호 확인이 다르면 false', () => {
        expect(canSubmitSignup(true, email, password, 'different123', false)).toBe(false);
    });
});

describe('passwordHint', () => {
    test('조건을 모두 만족하면 빈 문자열을 반환한다', () => {
        expect(passwordHint('abc12345')).toBe('');
    });

    test('길이가 짧으면 안내에 "자 이상"이 포함된다', () => {
        expect(passwordHint('a1')).toMatch(/자 이상/);
    });

    test('영문이 없으면 안내에 "영문"이 포함된다', () => {
        expect(passwordHint('12345678')).toMatch(/영문/);
    });

    test('숫자가 없으면 안내에 "숫자"가 포함된다', () => {
        expect(passwordHint('abcdefgh')).toMatch(/숫자/);
    });

    test('빈 문자열이면 세 조건 모두 부족하다고 안내한다', () => {
        const hint = passwordHint('');
        expect(hint).toMatch(/자 이상/);
        expect(hint).toMatch(/영문/);
        expect(hint).toMatch(/숫자/);
    });
});
