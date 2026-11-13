import { describe, expect, it, vi } from 'vitest';
vi.stubEnv('JWT_SECRET_KEY', 'test-secret');
import { generateCode, hashCode, verifyCode, phoneSchema, MAX_ATTEMPTS, maskPhone, kstDayStartUtc } from './phone';

const now = new Date('2026-11-12T00:00:00Z');
const row = (patch = {}) => ({ code_hash: hashCode('01012345678', '123456'), attempts: 0, expires_at: new Date(now.getTime() + 60_000), verified_at: null, ...patch });

describe('phone auth', () => {
    it('코드는 6자리 숫자', () => { for (let i = 0; i < 50; i++) expect(generateCode()).toMatch(/^\d{6}$/); });
    it('해시는 번호·코드에 따라 달라지고 64자 hex', () => {
        expect(hashCode('01012345678', '123456')).toMatch(/^[0-9a-f]{64}$/);
        expect(hashCode('01012345678', '123457')).not.toBe(hashCode('01012345678', '123456'));
        expect(hashCode('01012345679', '123456')).not.toBe(hashCode('01012345678', '123456'));
    });
    it('일치 → ok, 불일치 → mismatch, 만료 → expired, 5회 초과 → exhausted, 사용됨 → used', () => {
        expect(verifyCode(row(), '01012345678', '123456', now)).toBe('ok');
        expect(verifyCode(row(), '01012345678', '000000', now)).toBe('mismatch');
        expect(verifyCode(row({ expires_at: new Date(now.getTime() - 1) }), '01012345678', '123456', now)).toBe('expired');
        expect(verifyCode(row({ attempts: MAX_ATTEMPTS }), '01012345678', '123456', now)).toBe('exhausted');
        expect(verifyCode(row({ verified_at: now }), '01012345678', '123456', now)).toBe('used');
    });
    it('번호 스키마는 하이픈을 제거하고 유선번호를 거부', () => {
        expect(phoneSchema.parse('010-1234-5678')).toBe('01012345678');
        expect(phoneSchema.safeParse('02-123-4567').success).toBe(false);
    });
});

describe('maskPhone', () => {
    it('앞 3자리·뒤 4자리만 남기고 중간을 마스킹한다', () => {
        expect(maskPhone('01012345678')).toBe('010****5678');
    });
    it('너무 짧은 입력은 전체를 마스킹한다', () => {
        expect(maskPhone('12345')).toBe('***');
    });
});

describe('kstDayStartUtc', () => {
    it('UTC 09:00~익일 08:59:59는 모두 같은 KST 날짜(00:00 KST)로 모인다', () => {
        const noon = kstDayStartUtc(new Date('2026-11-12T03:00:00Z')); // KST 12:00
        const justBeforeRollover = kstDayStartUtc(new Date('2026-11-12T14:59:59Z')); // KST 23:59:59
        expect(noon.toISOString()).toBe('2026-11-11T15:00:00.000Z');
        expect(justBeforeRollover.toISOString()).toBe('2026-11-11T15:00:00.000Z');
    });
    it('UTC 15:00(=KST 자정)이 되면 다음 날로 넘어간다', () => {
        const rolledOver = kstDayStartUtc(new Date('2026-11-12T15:00:00Z')); // KST 00:00(11/13)
        expect(rolledOver.toISOString()).toBe('2026-11-12T15:00:00.000Z');
    });
});
