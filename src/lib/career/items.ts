/**
 * 자소서·역량 진단 공통 문항(16개)과 점수·수준 집계 (순수 함수)
 */
import type { CompetencyKey } from './schema';

export interface CareerItem {
    id: string;
    competency: CompetencyKey;
    text: string;
}

export const COMMON_ITEMS: readonly CareerItem[] = [
    { id: 'communication_1', competency: 'communication', text: '내 의견을 근거와 함께 짧게 설명할 수 있다' },
    { id: 'communication_2', competency: 'communication', text: '상대가 말한 요지를 정리해 되물을 수 있다' },
    { id: 'problemSolving_1', competency: 'problemSolving', text: '문제가 생기면 원인을 나눠서 본다' },
    { id: 'problemSolving_2', competency: 'problemSolving', text: '대안을 2개 이상 비교해 고른다' },
    { id: 'teamwork_1', competency: 'teamwork', text: '맡은 역할을 정해진 기한까지 끝낸다' },
    { id: 'teamwork_2', competency: 'teamwork', text: '의견이 다르면 상대 입장을 먼저 들어본다' },
    { id: 'selfManagement_1', competency: 'selfManagement', text: '하루 할 일의 순서를 정해 실행한다' },
    { id: 'selfManagement_2', competency: 'selfManagement', text: '실수한 일은 원인을 적어두고 다시 반복하지 않는다' },
    { id: 'information_1', competency: 'information', text: '필요한 정보를 검색해 사실인지 확인한다' },
    { id: 'information_2', competency: 'information', text: '문서·엑셀 같은 도구로 자료를 정리할 수 있다' },
    { id: 'jobKnowledge_1', competency: 'jobKnowledge', text: '지원 직무에서 쓰이는 기본 용어와 절차를 안다' },
    { id: 'jobKnowledge_2', competency: 'jobKnowledge', text: '그 일과 비슷한 업무나 과제를 해본 적이 있다' },
    { id: 'organization_1', competency: 'organization', text: '내 업무가 조직 전체 목표와 어떻게 연결되는지 설명할 수 있다' },
    { id: 'organization_2', competency: 'organization', text: '규칙과 절차를 지키며 협조해야 할 부서를 파악한다' },
    { id: 'learning_1', competency: 'learning', text: '모르는 것이 생기면 스스로 찾아서 익힌다' },
    { id: 'learning_2', competency: 'learning', text: '새로운 방식을 배우면 바로 업무에 적용해본다' },
] as const;

export const ITEMS_PER_PAGE = 4;

export type CompetencyLevel = '상' | '중' | '하';

const ALL_COMPETENCY_KEYS = Array.from(new Set(COMMON_ITEMS.map(item => item.competency))) as CompetencyKey[];

/**
 * 역량별 평균 점수(소수 1자리)를 낸다. 문항이 없는 역량은 0이다.
 */
export function scoreCompetencies(
    items: readonly CareerItem[],
    ratings: Record<string, number>,
): Record<CompetencyKey, number> {
    const result = {} as Record<CompetencyKey, number>;
    for (const key of ALL_COMPETENCY_KEYS) {
        const scores = items
            .filter(item => item.competency === key)
            .map(item => ratings[item.id])
            .filter((v): v is number => typeof v === 'number');
        result[key] = scores.length === 0 ? 0 : Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
    }
    return result;
}

/**
 * 평균 점수를 수준으로 환산한다.
 */
export function levelOf(score: number): CompetencyLevel {
    if (score >= 4) return '상';
    if (score >= 3) return '중';
    return '하';
}
