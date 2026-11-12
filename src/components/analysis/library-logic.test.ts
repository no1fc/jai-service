/**
 * library-logic.ts 테스트 — /api/analysis/me 응답을 보관함 화면의 guest/user 상태로 바꾸는 분기.
 */
import { describe, expect, test } from 'vitest';
import { resolveMeState } from './library-logic';

describe('resolveMeState', () => {
    test('요청이 실패하면(ok=false) guest로 취급한다', () => {
        expect(resolveMeState(false, { id: 1 })).toEqual({ kind: 'guest' });
    });

    test('요청이 성공하고 user가 있으면 user를 반환한다', () => {
        expect(resolveMeState(true, { id: 1 })).toEqual({ kind: 'user' });
    });

    test('요청이 성공했어도 user가 null/undefined면 guest로 취급한다', () => {
        expect(resolveMeState(true, null)).toEqual({ kind: 'guest' });
        expect(resolveMeState(true, undefined)).toEqual({ kind: 'guest' });
    });
});
