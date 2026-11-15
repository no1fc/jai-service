import { describe, expect, it } from 'vitest';
import { buildCacheKey, buildCompareCacheKey, normalizeKeyword } from './cache-key';

const base = { type: 'job', keyword: '핀테크 PM', scope: 'kr', includeCompetitors: true, includeTrends: true } as const;

describe('cache-key.ts의 normalizeKeyword 재노출', () => {
    it('keywords.ts의 normalizeKeyword를 그대로 재노출한다(기존 import 경로 유지)', () => {
        expect(normalizeKeyword('  핀테크   PM ')).toBe('핀테크 pm');
    });
});

describe('buildCacheKey', () => {
    it('64자 hex를 반환하고 같은 입력은 같은 키다', () => {
        const k = buildCacheKey(base);
        expect(k).toMatch(/^[0-9a-f]{64}$/);
        expect(buildCacheKey({ ...base, keyword: '핀테크  pm' })).toBe(k);
    });
    it('유형·범위·옵션이 다르면 키가 다르다', () => {
        const k = buildCacheKey(base);
        expect(buildCacheKey({ ...base, type: 'industry' })).not.toBe(k);
        expect(buildCacheKey({ ...base, scope: 'global' })).not.toBe(k);
        expect(buildCacheKey({ ...base, includeTrends: false })).not.toBe(k);
    });
});

const compareBase = { type: 'job', keywords: ['B', 'A'], scope: 'kr', includeCompetitors: true, includeTrends: true } as const;

describe('buildCompareCacheKey', () => {
    it('키워드 순서·대소문자·공백과 무관하게 같은 키다', () => {
        expect(buildCompareCacheKey(compareBase)).toBe(buildCompareCacheKey({ ...compareBase, keywords: ['a', 'b '] }));
    });
    it('단일 buildCacheKey와는 같은 키워드라도 항상 다른 키다', () => {
        const single = buildCacheKey({ type: 'job', keyword: 'A', scope: 'kr', includeCompetitors: true, includeTrends: true });
        const compare = buildCompareCacheKey({ ...compareBase, keywords: ['A'] });
        expect(compare).not.toBe(single);
    });
});
