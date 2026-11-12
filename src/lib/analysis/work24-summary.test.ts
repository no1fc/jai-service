import { describe, expect, it } from 'vitest';
import { annualSalaryManwon, summarizeWork24 } from './work24-summary';
import type { Work24Posting } from './work24';

function posting(overrides: Partial<Work24Posting> = {}): Work24Posting {
    return {
        title: 't', company: 'c', salTpNm: '연봉', minSal: '3000', maxSal: '4000', sal: '3000~4000만',
        region: '서울 강남구', empTpCd: '10', closeDt: '2026-12-31', wantedInfoUrl: 'https://work24.go.kr/1',
        ...overrides,
    } as Work24Posting;
}

describe('annualSalaryManwon', () => {
    it('연봉은 그대로, 월급은 ×12로 환산한다', () => {
        expect(annualSalaryManwon('연봉', '3000', '4000')).toBe(3500);
        expect(annualSalaryManwon('월급', '300', '300')).toBe(3600);
    });
    it('시급 등 환산 불가 유형은 null', () => {
        expect(annualSalaryManwon('시급', '1', '1')).toBeNull();
    });
});

describe('summarizeWork24', () => {
    it('http(s)가 아닌 wantedInfoUrl을 가진 공고는 샘플에서 제외한다', () => {
        const items = [
            posting({ wantedInfoUrl: 'javascript:alert(1)' }),
            posting({ wantedInfoUrl: 'https://work24.go.kr/2' }),
        ];
        const result = summarizeWork24(items, 2, '2026-11-12');
        expect(result.samples).toHaveLength(1);
        expect(result.samples[0].url).toBe('https://work24.go.kr/2');
    });
});
