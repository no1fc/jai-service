/**
 * AnalysisForm의 판단 로직(순수 함수) — DOM·네트워크 의존 없이 vitest로 검증한다.
 * 비교(2개 이상 키워드) 여부는 `parseKeywords` 결과 개수로만 판단한다(설계서 5.2·5.6).
 */
import { parseKeywords } from '@/lib/analysis/keywords';
import { ANALYSIS_TYPE_LABEL, type AnalysisRequest } from '@/lib/analysis/schema';

/** 분석 실행 버튼 문구 — 키워드 2개 이상이면 "N개 직무/산업 비교 분석하기", 아니면 기본 문구. */
export function compareButtonLabel(keyword: string, type: AnalysisRequest['type']): string {
    const n = parseKeywords(keyword).length;
    if (n < 2) return 'J.AI 분석 실행하기';
    const typeLabel = ANALYSIS_TYPE_LABEL[type].replace(' 분석', '');
    return `${n}개 ${typeLabel} 비교 분석하기`;
}

interface AnalysisRequestBodyParams {
    type: AnalysisRequest['type'];
    keyword: string;
    scope: AnalysisRequest['scope'];
    includeCompetitors: boolean;
    includeTrends: boolean;
    force?: boolean;
}

/** 요청 바디 — 키워드 2개 이상이면 `keywords` 배열, 아니면 `keyword` 단일 문자열(trim)만 담는다. */
export function buildAnalysisRequestBody(params: AnalysisRequestBodyParams): Record<string, unknown> {
    const { type, keyword, scope, includeCompetitors, includeTrends, force } = params;
    const keywords = parseKeywords(keyword);
    const base = { type, scope, includeCompetitors, includeTrends };
    const kwField = keywords.length >= 2 ? { keywords } : { keyword: keyword.trim() };
    return force ? { ...base, ...kwField, force: true } : { ...base, ...kwField };
}

/** 쉼표(반각·전각)로 구분된 입력의 마지막 토큰(trim)만 반환한다 — 추천 칩 질의어 판단용. */
export function lastToken(raw: string): string {
    const parts = raw.split(/[,，]/);
    return parts[parts.length - 1].trim();
}

/** 추천 칩 클릭 시 마지막 토큰만 picked 값으로 치환하고 앞 토큰은 그대로 유지한다. */
export function replaceLastToken(raw: string, picked: string): string {
    const parts = raw.split(/[,，]/);
    parts[parts.length - 1] = picked;
    return parts.map(p => p.trim()).join(', ');
}
