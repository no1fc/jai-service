import { describe, expect, it } from 'vitest';
import { normalizeKeyword, parseKeywords } from './keywords';

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

describe('parseKeywords', () => {
    it('쉼표(반각·전각)로 분리하고 trim·빈 값 제거·정규화 기준 중복 제거(앞의 것 유지)한다', () => {
        expect(parseKeywords('핀테크 PM, 데이터 분석가 ，핀테크  pm, ')).toEqual(['핀테크 PM', '데이터 분석가']);
    });
    it('구분자가 없으면 단일 키워드 배열을 반환한다', () => {
        expect(parseKeywords('단일')).toEqual(['단일']);
    });
    it('개수 상한은 자르지 않고 그대로 반환한다(검증은 스키마가 담당)', () => {
        expect(parseKeywords('a, b, c, d')).toHaveLength(4);
    });
});
