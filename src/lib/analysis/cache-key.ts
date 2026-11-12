/**
 * 리포트 캐시 키 — 클라이언트/서버 공용 순수 함수.
 * 같은 (유형, 정규화 키워드, 범위, 옵션) 요청은 같은 키를 갖는다.
 */
import { createHash } from 'crypto';
import type { AnalysisRequest } from './schema';

/** 허용 문자: 한글·영문·숫자·공백·/ + # . & - */
const DISALLOWED = /[^\p{Script=Hangul}\p{Script=Latin}0-9 /+#.&-]/gu;

export function normalizeKeyword(raw: string): string {
    return raw.normalize('NFKC').toLowerCase().replace(DISALLOWED, '').replace(/\s+/g, ' ').trim();
}

export function buildCacheKey(req: AnalysisRequest): string {
    const parts = [req.type, normalizeKeyword(req.keyword), req.scope, req.includeCompetitors ? 1 : 0, req.includeTrends ? 1 : 0];
    return createHash('sha256').update(parts.join('|')).digest('hex');
}
