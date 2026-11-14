/** suggest.ts 테스트 — 리포트 keyword·relatedJobs·시드 병합, 정규화 기준 중복/자기 자신 제거, 최대 SUGGEST_MAX개. */
import { describe, expect, it } from 'vitest';
import { SUGGEST_MAX, mergeSuggestions } from './suggest';

describe('mergeSuggestions', () => {
    it('리포트 keyword → relatedJobs → 시드(부분 일치) 순서로 합치고, 정규화 기준 중복을 제거한다', () => {
        const result = mergeSuggestions(
            '핀테',
            [{ keyword: '핀테크 PM', relatedJobs: ['프로덕트 매니저', '핀테크 pm'] }],
            ['핀테크 개발자', '마케터'],
        );
        expect(result).toEqual(['핀테크 PM', '프로덕트 매니저', '핀테크 개발자']);
    });

    it('질의와 정규화 기준 동일한 자기 자신은 제거한다', () => {
        const result = mergeSuggestions(
            '핀테크 pm',
            [{ keyword: '핀테크 PM', relatedJobs: ['프로덕트 매니저'] }],
            [],
        );
        expect(result).not.toContain('핀테크 PM');
        expect(result).toEqual(['프로덕트 매니저']);
    });

    it(`후보가 ${SUGGEST_MAX + 1}개면 ${SUGGEST_MAX}개로 자른다`, () => {
        const relatedJobs = Array.from({ length: 7 }, (_, i) => `관련직무${i}`);
        const result = mergeSuggestions('질의', [{ keyword: '본체', relatedJobs }], []);
        expect(result).toHaveLength(SUGGEST_MAX);
    });

    it('시드는 정규화된 질의를 부분 포함할 때만 후보에 넣는다', () => {
        const result = mergeSuggestions('개발', [], ['웹 개발자', '디자이너']);
        expect(result).toEqual(['웹 개발자']);
    });

    it('빈 입력이면 빈 배열을 반환한다', () => {
        expect(mergeSuggestions('질의', [], [])).toEqual([]);
    });
});
