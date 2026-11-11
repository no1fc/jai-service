/**
 * 2026년 국민취업지원제도 기준값
 * 2027년 기준은 같은 형태의 criteria-2027.ts를 추가해 교체한다. (추후 과제)
 */
import type { EligibilityCriteria } from './types';

export const CRITERIA_2026: EligibilityCriteria = {
    year: 2026,
    medianIncome: {
        1: 2564238,
        2: 4199292,
        3: 5359036,
        4: 6494738,
        5: 7556719,
        6: 8555952,
        7: 9515150,
    },
    minAge: 15,
    maxAge: 69,
    youthMaxAge: 34,
    maxMilitaryExtensionMonths: 36,
    type1MonthlyAllowance: 600000,
    type1AllowanceMonths: 6,
};
