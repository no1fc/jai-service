/**
 * 자체(이메일/비밀번호) 계정 로직 — 비밀번호 해시(bcrypt)·임시 비밀번호 생성·로그인 잠금 판정.
 * 서버 전용(bcrypt·crypto import). 클라이언트에서 쓸 Zod 스키마·상수는 {@link ./local-schema}에 분리해
 * 거기서 다시 내보낸다(Task 14에서 폼 쪽이 그대로 import).
 */
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';

export {
    EMAIL_MAX,
    PASSWORD_MIN,
    PASSWORD_MAX,
    LOCK_THRESHOLD,
    LOCK_MINUTES,
    emailSchema,
    passwordSchema,
    signupSchema,
    loginSchema,
    changePasswordSchema,
    maskEmail,
} from './local-schema';

const BCRYPT_COST = 10;
const TEMP_PASSWORD_BYTES = 9; // base64url 인코딩 시 12자

/** 계정이 현재 잠겨 있는지(locked_until이 미래 시각인지) 판정한다. */
export function isLocked(lockedUntil: Date | null, now: Date): boolean {
    return lockedUntil !== null && lockedUntil.getTime() > now.getTime();
}

/**
 * 관리자가 참여자에게 구두로 전달할 임시 비밀번호(12자)를 생성한다.
 * base64url은 영문·숫자·`-`·`_`로만 구성되어 영문·숫자가 모두 포함될 때까지 재생성한다
 * (passwordSchema가 요구하는 영문+숫자 조건을 항상 만족시키기 위함).
 */
export function generateTempPassword(): string {
    let candidate: string;
    do {
        candidate = randomBytes(TEMP_PASSWORD_BYTES).toString('base64url');
    } while (!/[a-zA-Z]/.test(candidate) || !/\d/.test(candidate));
    return candidate;
}

export const hashPassword = (plain: string): Promise<string> => bcrypt.hash(plain, BCRYPT_COST);
export const verifyPassword = (plain: string, hash: string): Promise<boolean> => bcrypt.compare(plain, hash);

// 계정이 존재하지 않을 때도 bcrypt.compare와 동일한 시간이 걸리도록 비교 대상으로 쓰는 더미 해시.
// 모듈 로드 시 1회만 계산한다(요청마다 계산하면 타이밍 균등화 의미가 없고 비용만 늘어난다).
export const DUMMY_HASH: string = bcrypt.hashSync(randomBytes(32).toString('hex'), BCRYPT_COST);
