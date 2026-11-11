import { describe, expect, it } from 'vitest';
import { DIAGNOSIS_QUESTIONS, parseDiagnosisAnswers } from './answers';

const raw = {
    age: '28', militaryMonths: '0', status: 'unemployed', excluded: 'none', specialGroup: 'no',
    familySize: '2', monthlyIncome: '250', property: 'under1', workDays: 'over100',
    hasPreschoolChild: 'no', similarProgram: 'none', region: '서울특별시 강남구',
};

describe('parseDiagnosisAnswers', () => {
    it('문자열 응답을 정규화한다 (소득은 만원 → 원)', () => {
        const r = parseDiagnosisAnswers(raw);
        expect(r.ok).toBe(true);
        if (r.ok) {
            expect(r.answers.age).toBe(28);
            expect(r.answers.monthlyIncome).toBe(2_500_000);
            expect(r.answers.specialGroup).toBe(false);
        }
    });

    it('숫자가 아닌 나이는 거부한다', () => {
        expect(parseDiagnosisAnswers({ ...raw, age: '스물' }).ok).toBe(false);
    });

    it('누락된 항목은 거부한다', () => {
        const rest = Object.fromEntries(Object.entries(raw).filter(([k]) => k !== 'region'));
        expect(parseDiagnosisAnswers(rest).ok).toBe(false);
    });

    it('질문 id는 DiagnosisAnswers 키와 일치하고 지역이 마지막이다', () => {
        expect(DIAGNOSIS_QUESTIONS.map(q => q.id).sort()).toEqual(Object.keys(raw).sort());
        expect(DIAGNOSIS_QUESTIONS.at(-1)?.type).toBe('region');
    });

    it('familySize 8 이상은 거부한다', () => {
        expect(parseDiagnosisAnswers({ ...raw, familySize: '8' }).ok).toBe(false);
    });

    it('age 121은 NUMBER_LIMITS 범위를 초과하여 거부한다', () => {
        expect(parseDiagnosisAnswers({ ...raw, age: '121' }).ok).toBe(false);
    });

    it('monthlyIncome 100001은 NUMBER_LIMITS 범위를 초과하여 거부한다', () => {
        expect(parseDiagnosisAnswers({ ...raw, monthlyIncome: '100001' }).ok).toBe(false);
    });
});
