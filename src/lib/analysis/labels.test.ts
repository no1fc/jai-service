import { describe, expect, it } from 'vitest';
import { dataBadgeLabels } from './labels';
import type { PublicReport } from './schema';

function makeReport(dataUsed: PublicReport['meta']['dataUsed']): PublicReport {
    return {
        publicId: '123e4567-e89b-12d3-a456-426655440000', type: 'job', keyword: '핀테크 PM', scope: 'kr',
        content: { invalid: true, reason: 'x' } as unknown as PublicReport['content'],
        meta: { dataUsed, work24: null, sources: [], searchEntryPoint: null, modelName: 'gemini-test' },
        createdAt: '2026-11-12T00:00:00.000Z', expiresAt: '2026-11-19T00:00:00.000Z',
    };
}

describe('dataBadgeLabels', () => {
    it('work24와 search가 모두 있으면 두 라벨을 반환한다', () => {
        expect(dataBadgeLabels(makeReport(['work24', 'search']))).toEqual(['고용24 반영', '웹 검색 반영']);
    });

    it('work24만 있으면 고용24 라벨만 반환한다', () => {
        expect(dataBadgeLabels(makeReport(['work24']))).toEqual(['고용24 반영']);
    });

    it('search만 있으면 웹 검색 라벨만 반환한다', () => {
        expect(dataBadgeLabels(makeReport(['search']))).toEqual(['웹 검색 반영']);
    });

    it('아무 데이터도 반영되지 않으면 AI 지식 기반 라벨을 반환한다', () => {
        expect(dataBadgeLabels(makeReport([]))).toEqual(['AI 지식 기반']);
    });
});
