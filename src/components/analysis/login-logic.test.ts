/**
 * login-logic.ts 테스트 — 동의 게이팅, 전화번호 형식, 단계 전이, 버튼 활성 조건,
 * 남은 시간 포맷, 콜백 에러 메시지 매핑.
 */
import { describe, expect, test } from 'vitest';
import {
    canRequestCode, canVerifyCode, formatCountdown, isAgreed, isValidPhoneFormat,
    nextPhoneStep, resolveCallbackErrorMessage, resolveExpiresInSec,
} from './login-logic';

describe('isAgreed', () => {
    test('두 체크가 모두 true일 때만 true를 반환한다', () => {
        expect(isAgreed(true, true)).toBe(true);
        expect(isAgreed(true, false)).toBe(false);
        expect(isAgreed(false, true)).toBe(false);
        expect(isAgreed(false, false)).toBe(false);
    });
});

describe('isValidPhoneFormat', () => {
    test('하이픈 유무와 무관하게 010~019 번호를 허용한다', () => {
        expect(isValidPhoneFormat('010-1234-5678')).toBe(true);
        expect(isValidPhoneFormat('01012345678')).toBe(true);
    });

    test('유선번호나 형식이 틀린 입력은 거부한다', () => {
        expect(isValidPhoneFormat('02-1234-5678')).toBe(false);
        expect(isValidPhoneFormat('010-12-5678')).toBe(false);
        expect(isValidPhoneFormat('')).toBe(false);
    });
});

describe('canRequestCode', () => {
    test('동의 + 유효한 번호 형식 + 로딩 아님일 때만 true', () => {
        expect(canRequestCode(true, '010-1234-5678', false)).toBe(true);
    });

    test('동의하지 않았으면 false', () => {
        expect(canRequestCode(false, '010-1234-5678', false)).toBe(false);
    });

    test('번호 형식이 틀리면 false', () => {
        expect(canRequestCode(true, '010-12', false)).toBe(false);
    });

    test('로딩 중이면 false', () => {
        expect(canRequestCode(true, '010-1234-5678', true)).toBe(false);
    });
});

describe('canVerifyCode', () => {
    test('6자리 코드이고 로딩 중이 아니면 true', () => {
        expect(canVerifyCode('123456', false)).toBe(true);
    });

    test('6자리가 아니면 false', () => {
        expect(canVerifyCode('12345', false)).toBe(false);
    });

    test('로딩 중이면 false', () => {
        expect(canVerifyCode('123456', true)).toBe(false);
    });
});

describe('nextPhoneStep', () => {
    test('발송 성공이면 code 단계로 전환한다', () => {
        expect(nextPhoneStep('phone', true)).toBe('code');
    });

    test('발송 실패면 현재 단계를 유지한다', () => {
        expect(nextPhoneStep('phone', false)).toBe('phone');
        expect(nextPhoneStep('code', false)).toBe('code');
    });
});

describe('resolveExpiresInSec', () => {
    test('유효한 숫자면 그대로 쓴다', () => {
        expect(resolveExpiresInSec(180)).toBe(180);
    });

    test('값이 없거나 숫자가 아니면 기본값(180)을 쓴다', () => {
        expect(resolveExpiresInSec(undefined)).toBe(180);
        expect(resolveExpiresInSec('abc')).toBe(180);
        expect(resolveExpiresInSec(-5)).toBe(180);
    });
});

describe('formatCountdown', () => {
    test('분:초 형식으로 포맷하고 초는 두 자리로 맞춘다', () => {
        expect(formatCountdown(65)).toBe('1:05');
        expect(formatCountdown(180)).toBe('3:00');
        expect(formatCountdown(5)).toBe('0:05');
    });

    test('음수는 0으로 바닥 처리한다', () => {
        expect(formatCountdown(-1)).toBe('0:00');
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
