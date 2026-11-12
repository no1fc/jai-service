import { describe, expect, it } from 'vitest';
import { buildCounselorReportPrompt, maskPhone } from './prompt';
import type { Lead } from '@/types/lead';

const lead: Lead = {
    id: 1, name: '홍길동', phone: '01012345678', region: '서울특별시', desired_job: '웹 개발',
    source: 'diagnosis', payload: JSON.stringify({ result: { type: '1유형_선발형', score: 84 } }),
    consent_at: '2026-11-11', report: null, status: 'new', created_at: '2026-11-11',
};

describe('report prompt', () => {
    it('연락처는 가운데를 가린다', () => {
        expect(maskPhone('01012345678')).toBe('010-****-5678');
        expect(maskPhone('0101234567')).toBe('010-***-4567');
    });
    it('프롬프트에 출처·희망직무·payload가 들어가고 이름·연락처는 넣지 않는다', () => {
        const p = buildCounselorReportPrompt(lead);
        expect(p).toContain('모의진단');
        expect(p).toContain('웹 개발');
        expect(p).toContain('1유형_선발형');
        expect(p).not.toContain('홍길동');
        expect(p).not.toContain('01012345678');
    });
});
