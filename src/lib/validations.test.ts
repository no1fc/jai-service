import { describe, expect, it } from 'vitest';
import { leadSchema, updatePrivacyPolicySchema } from './validations';

const valid = {
    name: '홍길동', phone: '010-1234-5678', region: '서울특별시', desiredJob: '웹 개발',
    source: 'diagnosis', payload: { a: 1 }, consent: true,
};

describe('leadSchema', () => {
    it('정상 입력을 통과시키고 연락처 하이픈을 제거한다', () => {
        const r = leadSchema.safeParse(valid);
        expect(r.success).toBe(true);
        if (r.success) expect(r.data.phone).toBe('01012345678');
    });
    it('동의하지 않으면 거부한다', () => {
        expect(leadSchema.safeParse({ ...valid, consent: false }).success).toBe(false);
    });
    it('휴대폰 형식이 아니면 거부한다', () => {
        expect(leadSchema.safeParse({ ...valid, phone: '02-123-4567' }).success).toBe(false);
    });
    it('알 수 없는 source는 거부한다', () => {
        expect(leadSchema.safeParse({ ...valid, source: 'etc' }).success).toBe(false);
    });
    it('payload가 20KB를 넘으면 거부한다', () => {
        expect(leadSchema.safeParse({ ...valid, payload: { big: 'x'.repeat(21000) } }).success).toBe(false);
    });
    it('region은 SIDO_LIST에 있는 값만 허용한다', () => {
        expect(leadSchema.safeParse({ ...valid, region: '서울' }).success).toBe(false);
        expect(leadSchema.safeParse({ ...valid, region: '서울특별시' }).success).toBe(true);
    });
});

describe('updatePrivacyPolicySchema', () => {
    it('정상 본문을 통과시킨다', () => {
        expect(updatePrivacyPolicySchema.safeParse({ policy: '## 제1조\n\n본문' }).success).toBe(true);
    });
    it('빈 문자열은 거부한다', () => {
        expect(updatePrivacyPolicySchema.safeParse({ policy: '' }).success).toBe(false);
    });
    it('공백만 있는 문자열은 거부한다', () => {
        expect(updatePrivacyPolicySchema.safeParse({ policy: '   \n  ' }).success).toBe(false);
    });
    it('30000자는 허용한다', () => {
        expect(updatePrivacyPolicySchema.safeParse({ policy: 'a'.repeat(30000) }).success).toBe(true);
    });
    it('30001자는 거부한다', () => {
        expect(updatePrivacyPolicySchema.safeParse({ policy: 'a'.repeat(30001) }).success).toBe(false);
    });
});
