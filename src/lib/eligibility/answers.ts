/**
 * 수급자격 모의진단 질문 정의와 응답 파서
 * 판정 규칙이 질문 id에 의존하므로 질문은 코드에서만 관리한다. (DB 오버라이드 없음)
 */
import { z } from 'zod';
import type { DiagnosisAnswers } from './types';

export interface QuestionChoice { id: string; label: string; value: string; isOther?: boolean }

export interface DiagnosisQuestion {
    id: keyof DiagnosisAnswers;
    message: string;
    type: 'choice' | 'number' | 'region';
    choices: QuestionChoice[];
    placeholder?: string;
}

const yesNo = (prefix: string): QuestionChoice[] => [
    { id: `${prefix}_no`, label: '아니요', value: 'no' },
    { id: `${prefix}_yes`, label: '네', value: 'yes' },
];

export const DIAGNOSIS_QUESTIONS: DiagnosisQuestion[] = [
    { id: 'age', type: 'number', choices: [], placeholder: '예: 28',
      message: '만 나이를 숫자로 입력해 주세요.' },
    { id: 'militaryMonths', type: 'choice', message: '병역 의무를 이행하셨나요?\n청년 연령은 복무 기간만큼(최대 3년) 늘어납니다.',
      choices: [
          { id: 'mil_0', label: '해당 없음', value: '0' },
          { id: 'mil_12', label: '1년 이하', value: '12' },
          { id: 'mil_21', label: '1년 초과 ~ 2년 이하', value: '21' },
          { id: 'mil_36', label: '2년 초과', value: '36' },
      ] },
    { id: 'status', type: 'choice', message: '현재 상황을 알려주세요.',
      choices: [
          { id: 'st_unemployed', label: '미취업 (구직 중)', value: 'unemployed' },
          { id: 'st_graduating', label: '졸업예정자 (마지막 학기)', value: 'graduating' },
          { id: 'st_student', label: '재학 중', value: 'student' },
          { id: 'st_part', label: '주 15시간 미만 근로 중', value: 'employedPart' },
          { id: 'st_employed', label: '주 15시간 이상 근로 중', value: 'employed15' },
      ] },
    { id: 'excluded', type: 'choice', message: '다음 중 해당하는 것이 있나요?',
      choices: [
          { id: 'ex_none', label: '해당 없음', value: 'none' },
          { id: 'ex_livelihood', label: '생계급여 수급 중', value: 'livelihood' },
          { id: 'ex_participating', label: '이미 국민취업지원제도 참여 중', value: 'participating' },
          { id: 'ex_military', label: '군 복무 중', value: 'military' },
          { id: 'ex_prison', label: '수감 중', value: 'prison' },
      ] },
    { id: 'specialGroup', type: 'choice', choices: yesNo('sg'),
      message: '특정계층에 해당하나요?\n(기초연금 수급자, 북한이탈주민, 결혼이민자, 위기청소년, 한부모가족, 영세자영업자 등)' },
    { id: 'familySize', type: 'choice', message: '주민등록상 가구원 수는 몇 명인가요?',
      choices: [1, 2, 3, 4, 5, 6, 7].map(n => ({
          id: `fam_${n}`, label: n === 7 ? '7인 이상' : `${n}인`, value: String(n),
      })) },
    { id: 'monthlyIncome', type: 'number', placeholder: '예: 250 (만 원 단위)',
      message: '가구원 전체의 월평균 소득(세전)을 만 원 단위로 입력해 주세요.\n소득이 없으면 0을 입력하세요.' },
    { id: 'property', type: 'choice', message: '가구원 전체의 재산 합계는 얼마인가요?\n(토지·건물·전세보증금 등, 부채 미차감)',
      choices: [
          { id: 'pr_1', label: '1억 원 이하', value: 'under1' },
          { id: 'pr_2_5', label: '1억 초과 ~ 2.5억 이하', value: 'under2_5' },
          { id: 'pr_4', label: '2.5억 초과 ~ 4억 이하', value: 'under4' },
          { id: 'pr_5', label: '4억 초과 ~ 5억 이하', value: 'under5' },
          { id: 'pr_over', label: '5억 원 초과', value: 'over5' },
      ] },
    { id: 'workDays', type: 'choice', message: '최근 2년 동안 일한 기간은 모두 합쳐 얼마인가요?',
      choices: [
          { id: 'wd_none', label: '없음', value: 'none' },
          { id: 'wd_30', label: '30일 미만', value: 'under30' },
          { id: 'wd_60', label: '30일 이상 ~ 60일 미만', value: 'under60' },
          { id: 'wd_100', label: '60일 이상 ~ 100일 미만', value: 'under100' },
          { id: 'wd_over', label: '100일(800시간) 이상', value: 'over100' },
      ] },
    { id: 'hasPreschoolChild', type: 'choice', choices: yesNo('child'),
      message: '함께 사는 미취학 자녀가 있나요?' },
    { id: 'region', type: 'region', choices: [],
      message: '거주 지역을 선택해 주세요.\n가까운 잡모아 지점을 안내해 드립니다.' },
];

const intString = (min: number, max: number) =>
    z.string().trim().regex(/^\d+$/, '숫자만 입력해 주세요.').transform(Number).pipe(z.number().int().min(min).max(max));
const yesNoBool = z.enum(['yes', 'no']).transform(v => v === 'yes');

const answersSchema = z.object({
    age: intString(0, 120),
    militaryMonths: intString(0, 120),
    status: z.enum(['unemployed', 'graduating', 'student', 'employed15', 'employedPart']),
    excluded: z.enum(['none', 'livelihood', 'participating', 'military', 'prison']),
    specialGroup: yesNoBool,
    familySize: intString(1, 20),
    monthlyIncome: intString(0, 100000).transform(manwon => manwon * 10000),
    property: z.enum(['under1', 'under2_5', 'under4', 'under5', 'over5']),
    workDays: z.enum(['none', 'under30', 'under60', 'under100', 'over100']),
    hasPreschoolChild: yesNoBool,
    region: z.string().trim().min(2).max(50),
});

export function parseDiagnosisAnswers(raw: Record<string, string>):
    { ok: true; answers: DiagnosisAnswers } | { ok: false; error: string } {
    const parsed = answersSchema.safeParse(raw);
    if (!parsed.success) {
        return { ok: false, error: parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ') };
    }
    return { ok: true, answers: parsed.data };
}
