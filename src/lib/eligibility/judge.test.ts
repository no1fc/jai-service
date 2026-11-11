import { describe, expect, it } from 'vitest';
import { judgeEligibility } from './judge';
import type { DiagnosisAnswers } from './types';

const base: DiagnosisAnswers = {
    age: 28,
    militaryMonths: 0,
    status: 'unemployed',
    excluded: 'none',
    specialGroup: false,
    familySize: 1,
    monthlyIncome: 1_000_000,
    property: 'under1',
    workDays: 'over100',
    hasPreschoolChild: false,
    similarProgram: 'none',
    region: '서울특별시 강남구',
};
const judge = (patch: Partial<DiagnosisAnswers>) => judgeEligibility({ ...base, ...patch });

describe('judgeEligibility', () => {
    it('중위 60% 이하 + 재산 기준 + 취업경험 100일 이상이면 요건심사형', () => {
        expect(judge({}).type).toBe('requirement');
    });

    it('1인 가구 소득 경계: 60% 정확히 이하면 요건심사형, 1원 초과면 아님', () => {
        expect(judge({ monthlyIncome: 1_538_542 }).type).toBe('requirement');
        expect(judge({ monthlyIncome: 1_538_544 }).type).not.toBe('requirement');
    });

    it('청년은 재산 5억 이하까지 요건심사형, 중장년은 4억 초과면 요건심사형 아님', () => {
        expect(judge({ property: 'under5' }).type).toBe('requirement');
        expect(judge({ age: 40, property: 'under5' }).type).not.toBe('requirement');
    });

    it('청년 + 취업경험 부족 + 중위 120% 이하 + 재산 5억 이하면 선발형(청년특례)', () => {
        const r = judge({ workDays: 'none', monthlyIncome: 3_000_000 });
        expect(r.type).toBe('selection_youth');
        expect(r.score).not.toBeNull();
    });

    it('중장년 + 취업경험 부족 + 중위 60% 이하 + 재산 4억 이하면 선발형(비경활)', () => {
        expect(judge({ age: 45, workDays: 'under30' }).type).toBe('selection_inactive');
    });

    it('만 34세는 청년, 35세는 중장년', () => {
        expect(judge({ age: 34 }).isYouth).toBe(true);
        expect(judge({ age: 35 }).isYouth).toBe(false);
    });

    it('병역 24개월이면 만 36세까지 청년, 36개월 초과분은 인정 안 함', () => {
        expect(judge({ age: 36, militaryMonths: 24 }).isYouth).toBe(true);
        expect(judge({ age: 37, militaryMonths: 24 }).isYouth).toBe(false);
        expect(judge({ age: 37, militaryMonths: 48 }).isYouth).toBe(true);
        expect(judge({ age: 38, militaryMonths: 48 }).isYouth).toBe(false);
    });

    it('청년이 소득 120% 초과면 Ⅱ유형 청년', () => {
        expect(judge({ workDays: 'none', monthlyIncome: 4_000_000 }).type).toBe('type2_youth');
    });

    it('청년이 재산 5억 초과면 Ⅱ유형 청년', () => {
        expect(judge({ property: 'over5' }).type).toBe('type2_youth');
    });

    it('중장년이 소득 60~100%면 Ⅱ유형 중장년, 100% 초과면 대상 아님', () => {
        expect(judge({ age: 50, monthlyIncome: 2_000_000 }).type).toBe('type2_middle');
        expect(judge({ age: 50, monthlyIncome: 3_000_000 }).type).toBe('ineligible');
    });

    it('특정계층 중장년은 소득 100% 초과여도 Ⅱ유형 특정계층', () => {
        expect(judge({ age: 50, monthlyIncome: 3_000_000, specialGroup: true }).type).toBe('type2_special');
    });

    it('연령 범위 밖, 재학생, 주 15시간 이상 근로, 제외 사유는 excluded', () => {
        expect(judge({ age: 14 }).type).toBe('excluded');
        expect(judge({ age: 70 }).type).toBe('excluded');
        expect(judge({ status: 'student' }).type).toBe('excluded');
        expect(judge({ status: 'employed15' }).type).toBe('excluded');
        expect(judge({ excluded: 'livelihood' }).type).toBe('excluded');
    });

    it('졸업예정자는 제외하지 않는다', () => {
        expect(judge({ status: 'graduating' }).type).toBe('requirement');
    });

    it('가구원 7인 이상은 7인 기준을 쓴다', () => {
        expect(judge({ familySize: 9, monthlyIncome: 5_709_090 }).incomeRatio).toBeCloseTo(0.6, 3);
    });

    it('선발형(청년특례) 점수: 소득 40% 이하 50 + 재산 1억 이하 30 + 취업 없음 4 + 미취학 자녀 5', () => {
        const r = judge({ workDays: 'none', monthlyIncome: 1_000_000, hasPreschoolChild: true });
        expect(r.type).toBe('selection_youth');
        expect(r.score).toBe(89);
        expect(r.scoreDetails).toHaveLength(4);
    });

    it('선발형(비경활) 점수: 소득 50~60% 20 + 재산 2.5억 초과 14 + 30~60일 22', () => {
        const r = judge({ age: 45, workDays: 'under60', monthlyIncome: 1_400_000, property: 'under4' });
        expect(r.type).toBe('selection_inactive');
        expect(r.score).toBe(56);
    });

    it('유사제도 1년 이내 수혜는 선발형 점수 10점 감점', () => {
        const r = judge({ workDays: 'none', monthlyIncome: 1_000_000, similarProgram: 'within1' });
        expect(r.type).toBe('selection_youth');
        expect(r.score).toBe(74);
        expect(r.scoreDetails.some(d => d.includes('-10점'))).toBe(true);
    });

    it('유사제도 1~2년 이내 수혜는 5점 감점, 요건심사형 판정에는 영향 없음', () => {
        const r = judge({ age: 45, workDays: 'under60', monthlyIncome: 1_400_000, property: 'under4', similarProgram: 'within2' });
        expect(r.score).toBe(51);
        expect(judge({ similarProgram: 'within1' }).type).toBe('requirement');
    });
});
