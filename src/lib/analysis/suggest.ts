/**
 * 입력 중 유사 직무 추천(AI 호출 없음, 설계서 6장 B-3) — 순수 함수, 클라이언트 안전.
 * 리포트 keyword(접두 일치, 호출자가 findJobReportsByPrefix로 미리 필터) → relatedJobs → 시드(부분 일치) 순서로 합친다.
 */
import { normalizeKeyword } from './keywords';
import { isValidReportKeyword } from './schema';

export const SUGGEST_MAX = 6;

export interface SuggestReportSource {
    keyword: string;
    relatedJobs: string[];
}

/**
 * normalizeKeyword 기준으로 중복·질의 자기 자신을 제거하며 최대 SUGGEST_MAX개까지 합친다.
 * @param query 사용자가 입력 중인 토큰(정규화 전)
 * @param fromReports findJobReportsByPrefix 결과(접두 일치 리포트)
 * @param seeds 정적 직무명 시드(job-seeds.ts) — 정규화된 query를 부분 포함할 때만 후보에 넣는다
 * @param aiSuggestions 2단계(선택) AI 폴백 결과 — 1단계(리포트·시드) 뒤에 이어 붙인다
 */
export function mergeSuggestions(
    query: string,
    fromReports: SuggestReportSource[],
    seeds: readonly string[],
    aiSuggestions: readonly string[] = [],
): string[] {
    const normQuery = normalizeKeyword(query);
    const seen = new Set<string>([normQuery]);
    const result: string[] = [];

    function add(candidate: string): void {
        if (result.length >= SUGGEST_MAX) return;
        if (!isValidReportKeyword(candidate)) return;
        const norm = normalizeKeyword(candidate);
        if (!norm || seen.has(norm)) return;
        seen.add(norm);
        result.push(candidate);
    }

    for (const report of fromReports) add(report.keyword);
    for (const report of fromReports) {
        for (const related of report.relatedJobs) add(related);
    }
    for (const seed of seeds) {
        if (normalizeKeyword(seed).includes(normQuery)) add(seed);
    }
    for (const ai of aiSuggestions) add(ai);

    return result.slice(0, SUGGEST_MAX);
}
