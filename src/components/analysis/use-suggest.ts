'use client';

/**
 * 입력 중 유사 직무 추천 훅(설계서 6장 B-3) — 마지막 토큰이 2자 이상일 때만 500ms 디바운스 후 조회한다.
 * type이 'job'이 아니면 조회하지 않는다. 타이핑이 빨라 응답이 역전되지 않도록 AbortController로 이전 요청을 취소한다.
 */
import { useEffect, useState } from 'react';
import { lastToken } from './analysis-form-logic';
import type { AnalysisRequest } from '@/lib/analysis/schema';

const DEBOUNCE_MS = 500;
const QUERY_MIN = 2;

export default function useSuggest(type: AnalysisRequest['type'], keyword: string): { suggestions: string[] } {
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const query = lastToken(keyword);
    const active = type === 'job' && query.length >= QUERY_MIN;

    useEffect(() => {
        if (!active) return;

        const controller = new AbortController();
        const timer = setTimeout(() => {
            fetch(`/api/analysis/suggest?type=job&q=${encodeURIComponent(query)}`, { signal: controller.signal })
                .then(res => res.json())
                .then(data => setSuggestions(Array.isArray(data?.suggestions) ? data.suggestions : []))
                .catch(() => { /* 취소(abort)·네트워크 오류는 조용히 무시 — 추천은 보조 기능이다 */ });
        }, DEBOUNCE_MS);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [active, query]);

    // active가 아니면(비-job 타입, 토큰 2자 미만) 직전 결과를 숨긴다 — 상태를 따로 리셋하지 않는다.
    return { suggestions: active ? suggestions : [] };
}
