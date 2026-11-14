import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: vi.fn(), getClientIp: vi.fn() }));
vi.mock('@/lib/analysis/reports', () => ({ findJobReportsByPrefix: vi.fn() }));
vi.mock('@/lib/db', () => ({ getSetting: vi.fn() }));
vi.mock('@/lib/analysis/suggest-ai', () => ({ checkSuggestAiLimit: vi.fn(), suggestWithAi: vi.fn() }));
vi.mock('@/lib/analysis/suggest-store', () => ({ getCachedSuggestions: vi.fn(), putCachedSuggestions: vi.fn() }));

import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { findJobReportsByPrefix } from '@/lib/analysis/reports';
import { getSetting } from '@/lib/db';
import { checkSuggestAiLimit, suggestWithAi } from '@/lib/analysis/suggest-ai';
import { getCachedSuggestions, putCachedSuggestions } from '@/lib/analysis/suggest-store';
import { GET } from './route';

function getRequest(query: string) {
    return new NextRequest(`http://localhost/api/analysis/suggest${query}`);
}

beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getClientIp).mockReturnValue('1.1.1.1');
    vi.mocked(checkRateLimit).mockReturnValue({ allowed: true, remaining: 59, resetAt: Date.now() + 1000 });
    vi.mocked(findJobReportsByPrefix).mockResolvedValue([]);
    // 기본값(설정 없음)은 꺼짐 — AI 폴백 관련 모듈은 설정이 'on'인 테스트에서만 개별 설정한다.
    vi.mocked(getSetting).mockResolvedValue(null);
    vi.mocked(checkSuggestAiLimit).mockReturnValue(true);
    vi.mocked(suggestWithAi).mockResolvedValue([]);
    vi.mocked(getCachedSuggestions).mockResolvedValue(null);
    vi.mocked(putCachedSuggestions).mockResolvedValue(undefined);
});

describe('GET /api/analysis/suggest', () => {
    it('rate limit에 걸리면 429를 반환하고 findJobReportsByPrefix를 호출하지 않는다', async () => {
        vi.mocked(checkRateLimit).mockReturnValue({ allowed: false, remaining: 0, resetAt: Date.now() + 1000 });
        const res = await GET(getRequest('?type=job&q=핀테'));
        expect(res.status).toBe(429);
        expect(findJobReportsByPrefix).not.toHaveBeenCalled();
    });

    it('q가 1자면 400을 반환한다', async () => {
        const res = await GET(getRequest('?type=job&q=a'));
        expect(res.status).toBe(400);
        expect(findJobReportsByPrefix).not.toHaveBeenCalled();
    });

    it('q가 없으면 400을 반환한다', async () => {
        const res = await GET(getRequest('?type=job'));
        expect(res.status).toBe(400);
    });

    it('q가 키워드 정규식에 맞지 않으면(허용 외 문자) 400을 반환한다', async () => {
        const res = await GET(getRequest(`?type=job&q=${encodeURIComponent('핀테!!')}`));
        expect(res.status).toBe(400);
        expect(findJobReportsByPrefix).not.toHaveBeenCalled();
    });

    it('type=industry면 DB를 조회하지 않고 빈 배열을 반환한다', async () => {
        const res = await GET(getRequest('?type=industry&q=핀테크'));
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json).toEqual({ success: true, suggestions: [] });
        expect(findJobReportsByPrefix).not.toHaveBeenCalled();
    });

    it('type=job이고 q가 정상이면 findJobReportsByPrefix를 1회 호출하고 추천을 반환한다', async () => {
        vi.mocked(findJobReportsByPrefix).mockResolvedValue([{ keyword: '핀테크 PM', relatedJobs: ['프로덕트 매니저'] }]);
        const res = await GET(getRequest('?type=job&q=핀테'));
        expect(res.status).toBe(200);
        expect(findJobReportsByPrefix).toHaveBeenCalledTimes(1);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.suggestions).toContain('핀테크 PM');
    });

    it('type이 없으면(기본값 job 아님, 명시 누락) 400을 반환한다', async () => {
        const res = await GET(getRequest('?q=핀테'));
        expect(res.status).toBe(400);
    });
});

describe('GET /api/analysis/suggest — 2단계 AI 폴백', () => {
    it('설정이 꺼져 있으면(기본값) AI를 호출하지 않는다', async () => {
        await GET(getRequest('?type=job&q=핀테'));
        expect(getCachedSuggestions).not.toHaveBeenCalled();
        expect(suggestWithAi).not.toHaveBeenCalled();
    });

    it('설정이 켜져 있어도 1단계 결과가 3개 이상이면 AI를 호출하지 않는다', async () => {
        vi.mocked(getSetting).mockResolvedValue('on');
        vi.mocked(findJobReportsByPrefix).mockResolvedValue([
            { keyword: '핀테크 PM', relatedJobs: ['프로덕트 매니저', '그로스 PM'] },
        ]);
        const res = await GET(getRequest('?type=job&q=핀테'));
        const json = await res.json();
        expect(json.suggestions.length).toBeGreaterThanOrEqual(3);
        expect(suggestWithAi).not.toHaveBeenCalled();
    });

    it('설정이 켜져 있고 캐시 적중이면 AI를 호출하지 않고 캐시 결과를 합친다', async () => {
        vi.mocked(getSetting).mockResolvedValue('on');
        vi.mocked(getCachedSuggestions).mockResolvedValue(['그로스 PM']);
        const res = await GET(getRequest('?type=job&q=핀테'));
        const json = await res.json();
        expect(json.suggestions).toContain('그로스 PM');
        expect(suggestWithAi).not.toHaveBeenCalled();
    });

    it('캐시 미스면 AI를 1회 호출해 결과를 합치고 캐시에 저장한다', async () => {
        vi.mocked(getSetting).mockResolvedValue('on');
        vi.mocked(getCachedSuggestions).mockResolvedValue(null);
        vi.mocked(suggestWithAi).mockResolvedValue(['그로스 PM']);
        const res = await GET(getRequest('?type=job&q=핀테'));
        const json = await res.json();
        expect(json.suggestions).toContain('그로스 PM');
        expect(suggestWithAi).toHaveBeenCalledTimes(1);
        expect(putCachedSuggestions).toHaveBeenCalledTimes(1);
        expect(putCachedSuggestions).toHaveBeenCalledWith('핀테', ['그로스 PM']);
    });

    it('일일 한도를 초과했으면(checkSuggestAiLimit=false) AI를 호출하지 않는다', async () => {
        vi.mocked(getSetting).mockResolvedValue('on');
        vi.mocked(checkSuggestAiLimit).mockReturnValue(false);
        const res = await GET(getRequest('?type=job&q=핀테'));
        expect(res.status).toBe(200);
        expect(suggestWithAi).not.toHaveBeenCalled();
        expect(putCachedSuggestions).not.toHaveBeenCalled();
    });

    it('AI 호출이 예외를 던져도(캐시 테이블 없음 등) 1단계 결과만으로 200을 반환한다', async () => {
        vi.mocked(getSetting).mockResolvedValue('on');
        vi.mocked(getCachedSuggestions).mockRejectedValue(new Error("Invalid object name 'analysis_suggestions'."));
        const res = await GET(getRequest('?type=job&q=핀테'));
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(suggestWithAi).not.toHaveBeenCalled();
    });

    it('AI 결과가 빈 배열이면 캐시에 저장하지 않는다', async () => {
        vi.mocked(getSetting).mockResolvedValue('on');
        vi.mocked(suggestWithAi).mockResolvedValue([]);
        const res = await GET(getRequest('?type=job&q=핀테'));
        expect(res.status).toBe(200);
        expect(putCachedSuggestions).not.toHaveBeenCalled();
    });
});
