import { describe, expect, it } from 'vitest';
import { judgeEligibility } from './judge';
import { buildExplanationPrompt, fallbackExplanation, toDiagnosisResult } from './explain';
import type { DiagnosisAnswers } from './types';

const answers: DiagnosisAnswers = {
    age: 28, militaryMonths: 0, status: 'unemployed', excluded: 'none', specialGroup: false,
    familySize: 1, monthlyIncome: 1_000_000, property: 'under1', workDays: 'none',
    hasPreschoolChild: false, similarProgram: 'none', region: '서울특별시 강남구',
};

describe('explain', () => {
    it('프롬프트에 판정 라벨과 근거, 지역이 들어간다', () => {
        const r = judgeEligibility(answers);
        const prompt = buildExplanationPrompt(r, answers);
        expect(prompt).toContain(r.label);
        expect(prompt).toContain(r.reasons[0]);
        expect(prompt).toContain('서울특별시 강남구');
    });

    it('선발형은 기존 DiagnosisResult 1유형_선발형으로 매핑되고 점수를 유지한다', () => {
        const r = judgeEligibility(answers);
        const d = toDiagnosisResult(r, fallbackExplanation(r));
        expect(d.type).toBe('1유형_선발형');
        expect(d.score).toBe(r.score);
    });

    it('excluded는 제한으로 매핑되고 사유가 restrictReason에 들어간다', () => {
        const r = judgeEligibility({ ...answers, status: 'student' });
        const d = toDiagnosisResult(r, fallbackExplanation(r));
        expect(d.type).toBe('제한');
        expect(d.restrictReason).toContain('재학');
    });

    it('Ⅱ유형은 subType을 채운다', () => {
        const r = judgeEligibility({ ...answers, property: 'over5' });
        const d = toDiagnosisResult(r, fallbackExplanation(r));
        expect(d.type).toBe('2유형');
        expect(d.subType).toBe('청년');
    });
});
