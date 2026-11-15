/**
 * 역량 → 국민취업지원제도 프로그램 매핑 (순수 데이터)
 */
import type { CompetencyKey } from './schema';

export const PROGRAM_MAP: Record<CompetencyKey, readonly string[]> = {
    communication: ['취업역량 강화 프로그램', '면접 컨설팅'],
    problemSolving: ['일경험 프로그램'],
    teamwork: ['일경험 프로그램', '취업역량 강화 프로그램'],
    selfManagement: ['심리·진로 상담'],
    information: ['디지털 기초 훈련(국민내일배움카드)'],
    jobKnowledge: ['국민내일배움카드 직업훈련', '일경험 프로그램'],
    organization: ['취업역량 강화 프로그램', '면접 컨설팅'],
    learning: ['국민내일배움카드 직업훈련'],
};

export const ALL_PROGRAMS: readonly string[] = Array.from(
    new Set(Object.values(PROGRAM_MAP).flatMap(programs => programs)),
);

/**
 * 후보 중 PROGRAM_MAP[key]에 있는 값만, 순서를 유지해 최대 2개 남긴다.
 */
export function filterPrograms(key: CompetencyKey, candidates: string[]): string[] {
    const allowed = PROGRAM_MAP[key];
    return candidates.filter(candidate => allowed.includes(candidate)).slice(0, 2);
}
