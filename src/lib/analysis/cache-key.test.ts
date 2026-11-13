import { describe, expect, it } from 'vitest';
import { buildCacheKey, normalizeKeyword } from './cache-key';

const base = { type: 'job', keyword: '핀테크 PM', scope: 'kr', includeCompetitors: true, includeTrends: true } as const;

describe('normalizeKeyword', () => {
    it('공백·대소문자·전각을 정규화한다', () => {
        expect(normalizeKeyword('  핀테크   PM ')).toBe('핀테크 pm');
        expect(normalizeKeyword('ＡＩ 반도체')).toBe('ai 반도체');
    });
    it('허용 문자(한글·영문·숫자·공백·/+#.&-) 외는 제거한다', () => {
        expect(normalizeKeyword('C++ 개발자!!')).toBe('c++ 개발자');
        expect(normalizeKeyword('UX/UI 디자이너 (신입)')).toBe('ux/ui 디자이너 신입');
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
