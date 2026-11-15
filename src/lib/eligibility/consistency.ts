/**
 * 모의진단 답변 모순 규칙 엔진 (순수 함수, 7개 규칙)
 */
import { CRITERIA_2026 } from './criteria-2026';
import { DIAGNOSIS_QUESTIONS } from './answers';
import type { DiagnosisAnswers, EligibilityCriteria } from './types';

export type ConflictLevel = 'error' | 'warn';
export interface Conflict { id: string; level: ConflictLevel; questions: [keyof DiagnosisAnswers, keyof DiagnosisAnswers]; message: string }

/** 모순 배너 "수정" 버튼에 쓰는 질문 고정 라벨 (DIAGNOSIS_QUESTIONS 메시지 대신 사람이 읽기 쉬운 짧은 이름) */
export const QUESTION_LABEL: Record<string, string> = {
    age: '나이',
    militaryMonths: '병역',
    status: '현재 상황',
    excluded: '참여 제한 사유',
    familySize: '가구원 수',
    monthlyIncome: '가구 소득',
    workDays: '최근 2년 취업 기간',
    hasPreschoolChild: '미취학 자녀',
};

const WORKING = new Set(['employed30', 'employedPart']);
const num = (v: string | undefined) => (v === undefined ? NaN : Number(v));

interface Rule { id: string; level: ConflictLevel; questions: Conflict['questions']; message: string;
    test: (a: Record<string, string>, c: EligibilityCriteria) => boolean }

const RULES: Rule[] = [
    { id: 'C1', level: 'error', questions: ['age', 'militaryMonths'], message: '만 18세 미만인데 병역을 이행했다고 답했습니다.',
      test: a => num(a.age) < 18 && num(a.militaryMonths) > 0 },
    { id: 'C2', level: 'error', questions: ['age', 'excluded'], message: '만 18세 미만인데 군 복무 중이라고 답했습니다.',
      test: a => num(a.age) < 18 && a.excluded === 'military' },
    { id: 'C3', level: 'error', questions: ['status', 'workDays'], message: '지금 근로 중인데 최근 2년 일한 기간이 "없음"입니다. 30일 미만이면 "30일 미만"을 골라 주세요.',
      test: a => WORKING.has(a.status) && a.workDays === 'none' },
    { id: 'C4', level: 'error', questions: ['status', 'excluded'], message: '군 복무·수감 중이면서 근로 중일 수 없습니다.',
      test: a => WORKING.has(a.status) && (a.excluded === 'military' || a.excluded === 'prison') },
    { id: 'C5', level: 'error', questions: ['familySize', 'hasPreschoolChild'], message: '가구원이 1인인데 함께 사는 미취학 자녀가 있다고 답했습니다. 자녀를 포함한 가구원 수를 확인해 주세요.',
      test: a => a.familySize === '1' && a.hasPreschoolChild === 'yes' },
    { id: 'C6', level: 'warn', questions: ['status', 'monthlyIncome'], message: '주 30시간 이상 근로 중인데 가구 소득이 0원입니다. 본인 급여를 포함해 다시 확인해 주세요.',
      test: a => a.status === 'employed30' && num(a.monthlyIncome) === 0 },
    { id: 'C7', level: 'warn', questions: ['excluded', 'monthlyIncome'], message: '생계급여 수급 중인데 가구 소득이 중위소득 60%를 넘습니다(생계급여 기준은 32% 이하).',
      test: (a, c) => a.excluded === 'livelihood' && num(a.monthlyIncome) * 10000 / c.medianIncome[Math.min(Math.max(num(a.familySize) || 1, 1), 7)] > 0.6 },
];

const answered = (a: Record<string, string>, qs: readonly string[]) => qs.every(q => a[q] !== undefined && a[q] !== '');

/**
 * 모의진단 답변의 모순을 검사한다.
 * 미답변 질문이 포함된 규칙은 평가하지 않는다.
 */
export function checkConsistency(answers: Record<string, string>, criteria: EligibilityCriteria = CRITERIA_2026): Conflict[] {
    return RULES
        .filter(r => answered(answers, r.id === 'C7' ? [...r.questions, 'familySize'] : r.questions) && r.test(answers, criteria))
        .map(({ id, level, questions, message }) => ({ id, level, questions, message }));
}

/**
 * 선택지 라벨·숫자·지역을 사람이 읽는 문구로 바꾼다.
 * 숫자는 "만 17세", "0만 원" 형식으로, 지역은 그대로 반환한다.
 */
export function answerLabel(questionId: string, value: string): string {
    const question = DIAGNOSIS_QUESTIONS.find(q => q.id === questionId);
    const choice = question?.choices.find(c => c.value === value);

    if (choice?.label) {
        return choice.label;
    }

    if (questionId === 'age') {
        return `만 ${value}세`;
    }

    if (questionId === 'monthlyIncome') {
        return `${value}만 원`;
    }

    return value;
}
