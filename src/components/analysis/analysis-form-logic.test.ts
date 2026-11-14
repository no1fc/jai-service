/** analysis-form-logic.ts 테스트 — 버튼 문구·요청 바디 분기(키워드 2개 이상 = 비교). */
import { describe, expect, it } from 'vitest';
import { buildAnalysisRequestBody, compareButtonLabel } from './analysis-form-logic';

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
