/** analysis-form-logic.ts 테스트 — 버튼 문구·요청 바디 분기(키워드 2개 이상 = 비교)·추천 칩 토큰 치환. */
import { describe, expect, it } from 'vitest';
import { buildAnalysisRequestBody, compareButtonLabel, isValidReportKeyword, lastToken, replaceLastToken } from './analysis-form-logic';

describe('compareButtonLabel', () => {
    it('키워드가 1개면 기본 문구를 반환한다', () => {
        expect(compareButtonLabel('핀테크 PM', 'job')).toBe('J.AI 분석 실행하기');
    });

    it('키워드가 2개면 "2개 직무 비교 분석하기"를 반환한다', () => {
        expect(compareButtonLabel('핀테크 PM, 데이터 분석가', 'job')).toBe('2개 직무 비교 분석하기');
    });

    it('키워드가 3개이고 산업 유형이면 "3개 산업 비교 분석하기"를 반환한다', () => {
        expect(compareButtonLabel('핀테크, 반도체, 바이오', 'industry')).toBe('3개 산업 비교 분석하기');
    });

    it('중복 키워드는 1개로 합쳐져 기본 문구가 된다', () => {
        expect(compareButtonLabel('핀테크 PM, 핀테크 pm', 'job')).toBe('J.AI 분석 실행하기');
    });
});

describe('buildAnalysisRequestBody', () => {
    const common = { type: 'job' as const, scope: 'kr' as const, includeCompetitors: true, includeTrends: false };

    it('키워드가 1개면 keyword 필드를 담는다', () => {
        const body = buildAnalysisRequestBody({ ...common, keyword: '  핀테크 PM  ' });
        expect(body).toEqual({ type: 'job', scope: 'kr', includeCompetitors: true, includeTrends: false, keyword: '핀테크 PM' });
    });

    it('키워드가 2개 이상이면 keywords 배열을 담고 keyword 필드는 없다', () => {
        const body = buildAnalysisRequestBody({ ...common, keyword: '핀테크 PM, 데이터 분석가' });
        expect(body).toEqual({ type: 'job', scope: 'kr', includeCompetitors: true, includeTrends: false, keywords: ['핀테크 PM', '데이터 분석가'] });
        expect(body).not.toHaveProperty('keyword');
    });

    it('force가 true면 force 필드를 추가한다', () => {
        const body = buildAnalysisRequestBody({ ...common, keyword: '핀테크 PM', force: true });
        expect(body).toMatchObject({ keyword: '핀테크 PM', force: true });
    });

    it('force가 없으면 force 필드를 넣지 않는다', () => {
        const body = buildAnalysisRequestBody({ ...common, keyword: '핀테크 PM' });
        expect(body).not.toHaveProperty('force');
    });
});

describe('lastToken', () => {
    it('쉼표가 없으면 전체 문자열(trim)을 반환한다', () => {
        expect(lastToken('핀테')).toBe('핀테');
    });
    it('쉼표로 구분된 마지막 토큰(trim)만 반환한다', () => {
        expect(lastToken('데이터 분석가, 웹')).toBe('웹');
    });
    it('마지막이 쉼표면 빈 문자열을 반환한다', () => {
        expect(lastToken('데이터 분석가, ')).toBe('');
    });
});

describe('replaceLastToken', () => {
    it('토큰이 1개면 전체를 추천 값으로 치환한다', () => {
        expect(replaceLastToken('핀테', '핀테크 PM')).toBe('핀테크 PM');
    });
    it('쉼표로 구분된 마지막 토큰만 추천 값으로 치환하고 앞 토큰은 유지한다', () => {
        expect(replaceLastToken('데이터 분석가, 웹', '웹 개발자')).toBe('데이터 분석가, 웹 개발자');
    });
    it('마지막이 쉼표(뒤 토큰 없음)여도 추천 값을 덧붙인다', () => {
        expect(replaceLastToken('데이터 분석가, ', '웹 개발자')).toBe('데이터 분석가, 웹 개발자');
    });
});

describe('isValidReportKeyword', () => {
    it('정상 키워드(한글·공백)는 true를 반환한다', () => {
        expect(isValidReportKeyword('핀테크 PM')).toBe(true);
    });
    it('1자(최소 2자 미만)는 false를 반환한다', () => {
        expect(isValidReportKeyword('A')).toBe(false);
    });
    it('허용되지 않는 문자(이모지 등)가 섞이면 false를 반환한다', () => {
        expect(isValidReportKeyword('핀테크 PM 🚀')).toBe(false);
    });
    it('50자를 넘으면 false를 반환한다', () => {
        expect(isValidReportKeyword('가'.repeat(51))).toBe(false);
    });
    it('앞뒤 공백은 trim 후 검사한다', () => {
        expect(isValidReportKeyword('  핀테크 PM  ')).toBe(true);
    });
});
