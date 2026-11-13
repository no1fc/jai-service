/**
 * 리포트 캐시 키 — 서버 전용 순수 함수(Node crypto 사용, 클라이언트에서 import 금지).
 * 같은 (유형, 정규화 키워드, 범위, 옵션) 요청은 같은 키를 갖는다.
 */
import { createHash } from 'crypto';
import type { AnalysisRequest, CompareRequest } from './schema';
import { normalizeKeyword } from './keywords';

/** normalizeKeyword는 순수 함수라 keywords.ts로 옮겼다 — 기존 호출부가 그대로 동작하도록 여기서 재노출. */
export { normalizeKeyword };

export function buildCacheKey(req: AnalysisRequest): string {
    const parts = [req.type, normalizeKeyword(req.keyword), req.scope, req.includeCompetitors ? 1 : 0, req.includeTrends ? 1 : 0];
    return createHash('sha256').update(parts.join('|')).digest('hex');
}

/**
 * 비교 리포트 캐시 키 — 키워드를 정규화 후 정렬해 사용하므로 사용자가 입력한 순서와 무관하게 같은 키다.
 * 단일 캐시 키(buildCacheKey)와는 'compare' 토큰이 섞여 들어가 같은 키워드라도 항상 다른 값을 갖는다.
 */
export function buildCompareCacheKey(req: CompareRequest): string {
    const sortedNorm = req.keywords.map(normalizeKeyword).sort().join(',');
    const parts = [req.type, 'compare', sortedNorm, req.scope, req.includeCompetitors ? 1 : 0, req.includeTrends ? 1 : 0];
    return createHash('sha256').update(parts.join('|')).digest('hex');
}
