/**
 * 수급자격 모의진단 타입 정의 (클라이언트/서버 공용, 런타임 의존성 없음)
 */

export type PropertyBand = 'under1' | 'under2_5' | 'under4' | 'under5' | 'over5';
export type WorkDaysBand = 'none' | 'under30' | 'under60' | 'under100' | 'over100';
export type WorkStatus = 'unemployed' | 'graduating' | 'student' | 'employed15' | 'employedPart';
export type ExcludedReason = 'none' | 'livelihood' | 'participating' | 'military' | 'prison';

/** 질문 응답을 정규화한 값 */
export interface DiagnosisAnswers {
    age: number;              // 만 나이
    militaryMonths: number;   // 병역 이행 개월 수 (0 = 해당 없음)
    status: WorkStatus;
    excluded: ExcludedReason;
    specialGroup: boolean;    // 특정계층(결혼이민자, 북한이탈주민, 위기청소년 등)
    familySize: number;       // 1~7 (7 = 7인 이상)
    monthlyIncome: number;    // 가구 월평균 소득(원)
    property: PropertyBand;
    workDays: WorkDaysBand;   // 최근 2년 내 취업 일수
    hasPreschoolChild: boolean;
    region: string;           // "시도 시군구"
}

export type EligibilityType =
    | 'requirement'
    | 'selection_inactive'
    | 'selection_youth'
    | 'type2_special'
    | 'type2_youth'
    | 'type2_middle'
    | 'ineligible'
    | 'excluded';

export interface EligibilityResult {
    type: EligibilityType;
    label: string;
    incomeRatio: number;      // 기준 중위소득 대비 비율 (0.6 = 60%)
    isYouth: boolean;
    score: number | null;     // 선발형만
    scoreDetails: string[];
    reasons: string[];        // 판정 근거 (사람이 읽는 문장)
}

export interface EligibilityCriteria {
    year: number;
    medianIncome: Record<number, number>; // 가구원 수(1~7) → 월 기준 중위소득
    minAge: number;
    maxAge: number;
    youthMaxAge: number;
    maxMilitaryExtensionMonths: number;
    type1MonthlyAllowance: number;
    type1AllowanceMonths: number;
}
