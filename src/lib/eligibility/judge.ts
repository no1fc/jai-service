/**
 * 국민취업지원제도 수급자격 규칙 엔진
 * AI 없이 결정적으로 유형을 판정한다. 설명 문구는 explain.ts에서 AI가 만든다.
 */
import { CRITERIA_2026 } from './criteria-2026';
import type {
    DiagnosisAnswers, EligibilityCriteria, EligibilityResult, EligibilityType, PropertyBand, SimilarProgramBand,
} from './types';

const LABELS: Record<EligibilityType, string> = {
    requirement: 'Ⅰ유형 요건심사형',
    selection_inactive: 'Ⅰ유형 선발형 (비경제활동)',
    selection_youth: 'Ⅰ유형 선발형 (청년특례)',
    type2_special: 'Ⅱ유형 특정계층',
    type2_youth: 'Ⅱ유형 청년',
    type2_middle: 'Ⅱ유형 중장년',
    ineligible: '참여 대상 아님',
    excluded: '참여 제한',
};

const EXCLUDED_REASONS: Record<Exclude<DiagnosisAnswers['excluded'], 'none'>, string> = {
    livelihood: '생계급여 수급자는 참여가 제한됩니다. (조건부 수급자는 가능)',
    participating: '이미 국민취업지원제도에 참여 중입니다.',
    military: '군 복무 중에는 참여할 수 없습니다.',
    prison: '수감 중에는 참여할 수 없습니다.',
};

/** 재산 구간의 상한(억 원). over5는 무한대 */
const PROPERTY_MAX_EOK: Record<PropertyBand, number> = {
    under1: 1, under2_5: 2.5, under4: 4, under5: 5, over5: Infinity,
};

const propertyWithin = (band: PropertyBand, limitEok: number) => PROPERTY_MAX_EOK[band] <= limitEok;

const SIMILAR_PROGRAM_PENALTY: Record<SimilarProgramBand, number> = {
    none: 0,
    within1: 10,
    within2: 5,
};

function result(
    type: EligibilityType, base: Pick<EligibilityResult, 'incomeRatio' | 'isYouth'>,
    reasons: string[], score: number | null = null, scoreDetails: string[] = [],
): EligibilityResult {
    return { type, label: LABELS[type], ...base, score, scoreDetails, reasons };
}

/** 선발형 점수 (DEFAULT_SCORE_TABLE 기준). youth=true면 청년특례 배점 */
function selectionScore(a: DiagnosisAnswers, ratio: number, youth: boolean) {
    const incomeBands: Array<[number, number, number]> = [
        [0.4, 40, 50], [0.5, 30, 45], [0.6, 20, 40], [0.8, 0, 35], [1.0, 0, 30], [1.2, 0, 30],
    ];
    const band = incomeBands.find(([max]) => ratio <= max);
    const income = band ? (youth ? band[2] : band[1]) : 0;

    const property = a.property === 'under1' ? 30 : a.property === 'under2_5' ? 22 : 14;

    const longWork = a.workDays === 'under100' || a.workDays === 'over100';
    const work = longWork ? (youth ? 20 : 30) : a.workDays === 'under60' ? (youth ? 12 : 22) : (youth ? 4 : 14);

    const details = [
        `가구 소득 (중위 ${Math.round(ratio * 100)}%): ${income}점`,
        `재산: ${property}점`,
        `최근 2년 취업기간: ${work}점`,
    ];
    let score = income + property + work;
    if (a.hasPreschoolChild) {
        score += 5;
        details.push('미취학 자녀 가점: 5점');
    }
    const similarProgramPenalty = SIMILAR_PROGRAM_PENALTY[a.similarProgram];
    if (similarProgramPenalty > 0) {
        score -= similarProgramPenalty;
        if (a.similarProgram === 'within1') {
            details.push(`유사제도 수혜(1년 이내) 감점: -${SIMILAR_PROGRAM_PENALTY.within1}점`);
        } else if (a.similarProgram === 'within2') {
            details.push(`유사제도 수혜(1~2년 이내) 감점: -${SIMILAR_PROGRAM_PENALTY.within2}점`);
        }
    }
    return { score, details };
}

export function judgeEligibility(
    a: DiagnosisAnswers, c: EligibilityCriteria = CRITERIA_2026,
): EligibilityResult {
    const familySize = Math.min(Math.max(Math.trunc(a.familySize), 1), 7);
    const incomeRatio = a.monthlyIncome / c.medianIncome[familySize];
    const militaryExt = Math.min(a.militaryMonths, c.maxMilitaryExtensionMonths) / 12;
    const isYouth = a.age >= c.minAge && a.age <= c.youthMaxAge + militaryExt;
    const base = { incomeRatio, isYouth };
    const pct = `중위소득 ${Math.round(incomeRatio * 100)}%`;

    // 1. 제외 대상
    if (a.age < c.minAge || a.age > c.maxAge) {
        return result('excluded', base, [`참여 가능 연령(만 ${c.minAge}~${c.maxAge}세)이 아닙니다.`]);
    }
    if (a.excluded !== 'none') return result('excluded', base, [EXCLUDED_REASONS[a.excluded]]);
    if (a.status === 'student') {
        return result('excluded', base, ['재학 중인 학생은 참여할 수 없습니다. (마지막 학기 졸업예정자는 가능)']);
    }
    if (a.status === 'employed30') {
        return result('excluded', base, ['주 30시간 이상 근로 중이면 참여가 제한됩니다. (주 30시간 미만 근로자는 참여 가능)']);
    }

    // 2. Ⅰ유형 요건심사형
    const propertyLimit = isYouth ? 5 : 4;
    if (incomeRatio <= 0.6 && propertyWithin(a.property, propertyLimit) && a.workDays === 'over100') {
        return result('requirement', base, [
            `가구 소득이 ${pct}로 60% 이하입니다.`,
            `재산이 ${propertyLimit}억 원 이하입니다.`,
            '최근 2년 내 100일(800시간) 이상 취업경험이 있습니다.',
        ]);
    }

    // 3. Ⅰ유형 선발형
    if (isYouth && incomeRatio <= 1.2 && propertyWithin(a.property, 5)) {
        const s = selectionScore(a, incomeRatio, true);
        return result('selection_youth', base, [
            '청년(만 15~34세, 병역 연장 포함)입니다.',
            `가구 소득이 ${pct}로 120% 이하입니다.`,
            '재산이 5억 원 이하입니다.',
        ], s.score, s.details);
    }
    if (!isYouth && incomeRatio <= 0.6 && propertyWithin(a.property, 4)) {
        const s = selectionScore(a, incomeRatio, false);
        return result('selection_inactive', base, [
            `가구 소득이 ${pct}로 60% 이하입니다.`,
            '재산이 4억 원 이하입니다.',
            '취업경험이 100일 미만이라 선발형으로 심사합니다.',
        ], s.score, s.details);
    }

    // 4. Ⅱ유형
    if (a.specialGroup) return result('type2_special', base, ['특정계층에 해당합니다.']);
    if (isYouth) return result('type2_youth', base, ['청년은 소득·재산과 무관하게 Ⅱ유형 참여가 가능합니다.']);
    if (incomeRatio <= 1.0) {
        return result('type2_middle', base, [`중장년이며 가구 소득이 ${pct}로 100% 이하입니다.`]);
    }

    return result('ineligible', base, [`중장년 기준(중위소득 100% 이하)을 넘습니다. (현재 ${pct})`]);
}
