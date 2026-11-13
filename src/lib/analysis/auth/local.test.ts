import { describe, expect, it } from 'vitest';
import {
    DUMMY_HASH,
    LOCK_MINUTES,
    LOCK_THRESHOLD,
    changePasswordSchema,
    emailSchema,
    generateTempPassword,
    hashPassword,
    isLocked,
    loginSchema,
    nextFailureState,
    passwordSchema,
    signupSchema,
    verifyPassword,
} from './local';

describe('emailSchema', () => {
    it('대문자·앞뒤 공백을 정규화한다', () => {
        expect(emailSchema.parse('  Foo@Bar.COM  ')).toBe('foo@bar.com');
    });
    it('형식이 올바르지 않으면 거부한다', () => {
        expect(emailSchema.safeParse('not-an-email').success).toBe(false);
    });
    it('101자를 넘으면 거부한다', () => {
        const local = 'a'.repeat(95);
        expect(emailSchema.safeParse(`${local}@b.com`).success).toBe(false);
    });
});

describe('passwordSchema', () => {
    it('7자는 거부한다', () => {
        expect(passwordSchema.safeParse('a1bcdef').success).toBe(false);
    });
    it('영문만 있으면 거부한다', () => {
        expect(passwordSchema.safeParse('abcdefgh').success).toBe(false);
    });
    it('숫자만 있으면 거부한다', () => {
        expect(passwordSchema.safeParse('12345678').success).toBe(false);
    });
    it('영문+숫자 8자 이상이면 허용한다', () => {
        expect(passwordSchema.safeParse('abcd1234').success).toBe(true);
    });
});

describe('signupSchema', () => {
    const base = { email: 'foo@bar.com', consent: true as const, ageConfirmed: true as const };
    it('비밀번호가 이메일과 같으면(대소문자 무관) 거부한다', () => {
        const result = signupSchema.safeParse({ ...base, password: 'FOO@BAR.COM' });
        expect(result.success).toBe(false);
    });
    it('정상 입력은 통과한다', () => {
        expect(signupSchema.safeParse({ ...base, password: 'abcd1234' }).success).toBe(true);
    });
});

describe('changePasswordSchema', () => {
    it('현재 비밀번호와 새 비밀번호가 같으면 거부한다', () => {
        const result = changePasswordSchema.safeParse({ currentPassword: 'abcd1234', newPassword: 'abcd1234' });
        expect(result.success).toBe(false);
    });
    it('서로 다르면 통과한다', () => {
        expect(changePasswordSchema.safeParse({ currentPassword: 'abcd1234', newPassword: 'xyz98765' }).success).toBe(true);
    });
});

describe('loginSchema', () => {
    it('빈 비밀번호는 거부한다', () => {
        expect(loginSchema.safeParse({ email: 'foo@bar.com', password: '' }).success).toBe(false);
    });
});

describe('isLocked', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    it('locked_until이 없으면 false', () => {
        expect(isLocked(null, now)).toBe(false);
    });
    it('미래 시각이면 true', () => {
        expect(isLocked(new Date(now.getTime() + 1000), now)).toBe(true);
    });
    it('과거 시각이면 false', () => {
        expect(isLocked(new Date(now.getTime() - 1000), now)).toBe(false);
    });
});

describe('nextFailureState', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    it(`${LOCK_THRESHOLD}회째면 now+${LOCK_MINUTES}분 잠금`, () => {
        const result = nextFailureState(LOCK_THRESHOLD - 1, now);
        expect(result.failedAttempts).toBe(LOCK_THRESHOLD);
        expect(result.lockedUntil).toEqual(new Date(now.getTime() + LOCK_MINUTES * 60 * 1000));
    });
    it('그 전에는 잠금 없이 카운트만 증가', () => {
        expect(nextFailureState(1, now)).toEqual({ failedAttempts: 2, lockedUntil: null });
    });
});

describe('generateTempPassword', () => {
    it('항상 12자이며 영문·숫자를 포함하고 passwordSchema를 통과한다(100회)', () => {
        for (let i = 0; i < 100; i++) {
            const pwd = generateTempPassword();
            expect(pwd).toHaveLength(12);
            expect(/[a-zA-Z]/.test(pwd)).toBe(true);
            expect(/\d/.test(pwd)).toBe(true);
            expect(passwordSchema.safeParse(pwd).success).toBe(true);
        }
    });
});

describe('hashPassword / verifyPassword', () => {
    it('해시를 검증하면 true, 다른 값은 false를 반환한다', async () => {
        const hash = await hashPassword('abcd1234');
        expect(await verifyPassword('abcd1234', hash)).toBe(true);
        expect(await verifyPassword('wrong1234', hash)).toBe(false);
    });
});

describe('DUMMY_HASH', () => {
    it('모듈 로드 시 생성된 bcrypt 해시 형식 문자열이다', () => {
        expect(DUMMY_HASH).toMatch(/^\$2[aby]\$10\$/);
    });
});
