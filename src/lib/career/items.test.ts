import { describe, expect, it } from 'vitest';
import { COMMON_ITEMS, levelOf, scoreCompetencies } from './items';
import { COMPETENCIES } from './schema';

describe('items', () => {
    it('공통 문항은 16개다', () => expect(COMMON_ITEMS).toHaveLength(16));

    it('역량별로 2개씩이다', () => {
        for (const { key } of COMPETENCIES) {
            expect(COMMON_ITEMS.filter(item => item.competency === key)).toHaveLength(2);
        }
    });

    it('문항 id는 유일하다', () => {
        const ids = COMMON_ITEMS.map(item => item.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('scoreCompetencies는 역량별 평균을 소수 1자리로 낸다', () => {
        const items = COMMON_ITEMS.filter(item => item.competency === 'communication');
        const scores = scoreCompetencies(items, { communication_1: 4, communication_2: 5 });
        expect(scores.communication).toBe(4.5);
    });

    it('scoreCompetencies는 맞춤 문항을 같은 역량에 합쳐 평균을 낸다', () => {
        const items = [
            ...COMMON_ITEMS.filter(item => item.competency === 'jobKnowledge'),
            { id: 'job_1', competency: 'jobKnowledge' as const, text: '맞춤 문항' },
        ];
        const scores = scoreCompetencies(items, { jobKnowledge_1: 3, jobKnowledge_2: 3, job_1: 6 });
        expect(scores.jobKnowledge).toBe(4);
    });

    it('scoreCompetencies는 문항이 없는 역량은 0이다', () => {
        const scores = scoreCompetencies([], {});
        expect(scores.communication).toBe(0);
    });

    it('levelOf는 4 이상이면 상이다', () => expect(levelOf(4)).toBe('상'));
    it('levelOf는 3 이상 4 미만이면 중이다', () => expect(levelOf(3.9)).toBe('중'));
    it('levelOf는 3 미만이면 하이다', () => expect(levelOf(2.9)).toBe('하'));
});
