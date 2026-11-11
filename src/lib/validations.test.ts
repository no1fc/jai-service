import { describe, expect, it } from 'vitest';
import { leadSchema } from './validations';

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
});
