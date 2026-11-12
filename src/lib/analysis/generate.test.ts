import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('./reports');
vi.mock('./limits');
vi.mock('./work24');
vi.mock('@/lib/gemini');
vi.mock('@/lib/db', () => ({ logApiUsage: vi.fn() }));
import * as reports from './reports';
import { checkDailyLimit } from './limits';
import { fetchWork24Summary } from './work24';
import { generateResponse, safeParseJSON } from '@/lib/gemini';
import { generateAnalysis } from './generate';
import type { StoredReport } from './reports';
import type { PublicReport } from './schema';

const req = { type: 'job', keyword: '핀테크 PM', scope: 'kr', includeCompetitors: true, includeTrends: true } as const;
const anon = { kind: 'anon' } as const;
const stored = { id: 1, public_id: 'uuid', type: 'job', keyword: '핀테크 PM', scope: 'kr', content: '{}', meta: '{}', created_at: new Date(), expires_at: new Date() } as unknown as StoredReport;
const validJob = { title: 't', summary: 's', aliases: [], mainTasks: ['a', 'b', 'c'], skills: { hard: [], soft: [], certifications: [] }, hiring: { summary: 'h', demandLevel: 'high', postingCount: null, topRegions: [] }, salary: { entry: 'e', mid: 'm', senior: 's', basis: 'b' }, roadmap: [{ stage: '1', period: 'p', actions: ['x'] }, { stage: '2', period: 'p', actions: ['x'] }, { stage: '3', period: 'p', actions: ['x'] }], relatedJobs: [] };
// 조사 호출(챗 모델·검색)과 리포트 호출(분석 모델·JSON) 결과를 각각 흉내낸다. 경쟁사 ON이면 1번째 호출=조사, 2번째 호출=리포트.
const researchResult = { text: '- A사 PM 채용 20% 증가(2026)', usageMetadata: null, modelName: 'flash-lite', sources: [{ title: 'A사', uri: 'https://a' }], searchEntryPoint: '<div>x</div>' };
const reportResult = { text: 'json', usageMetadata: null, modelName: 'gemini-3.8-flash', sources: [], searchEntryPoint: null };

beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(reports.toPublicReport).mockImplementation((r) => ({ publicId: r.public_id }) as unknown as PublicReport);
    vi.mocked(checkDailyLimit).mockResolvedValue({ allowed: true });
    vi.mocked(generateResponse).mockResolvedValueOnce(researchResult).mockResolvedValue(reportResult);
    vi.mocked(safeParseJSON).mockReturnValue(validJob);
    vi.mocked(reports.insertReport).mockResolvedValue(stored);
});

describe('generateAnalysis', () => {
    it('캐시 적중이면 Gemini·고용24를 호출하지 않고 요청만 기록한다', async () => {
        vi.mocked(reports.findFreshReport).mockResolvedValue(stored);
        const r = await generateAnalysis(req, anon, '1.1.1.1');
        expect(r.ok && r.cached).toBe(true);
        expect(generateResponse).not.toHaveBeenCalled();
        expect(fetchWork24Summary).not.toHaveBeenCalled();
        expect(reports.recordRequest).toHaveBeenCalledWith(1, anon, true);
    });
    it('캐시 미스·경쟁사 ON이면 한도 확인 → 고용24 → 조사 1회(챗·검색) → 리포트 1회(분석·JSON) → 저장 순서', async () => {
        vi.mocked(reports.findFreshReport).mockResolvedValue(null);
        vi.mocked(fetchWork24Summary).mockResolvedValue(null);
        const r = await generateAnalysis(req, anon, '1.1.1.1');
        expect(r.ok).toBe(true);
        expect(checkDailyLimit).toHaveBeenCalled();
        expect(fetchWork24Summary).toHaveBeenCalledWith('핀테크 PM');
        expect(generateResponse).toHaveBeenCalledTimes(2);
        const [researchCall, reportCall] = vi.mocked(generateResponse).mock.calls;
        expect(researchCall[2]).toBe(false);                      // 조사는 챗 모델(flash-lite)
        expect(researchCall[3]).toEqual({ googleSearch: true });  // 조사만 검색 사용
        expect(reportCall[2]).toBe(true);                          // 리포트는 분석 모델
        expect(reportCall[3]).toBeUndefined();                     // 리포트는 googleSearch 미사용(JSON 모드 유지)
        expect(reports.insertReport).toHaveBeenCalled();
    });
    it('경쟁사 OFF면 조사 호출 없이 리포트만 1회 호출한다', async () => {
        vi.mocked(reports.findFreshReport).mockResolvedValue(null);
        vi.mocked(fetchWork24Summary).mockResolvedValue(null);
        vi.mocked(generateResponse).mockReset().mockResolvedValue(reportResult);
        const r = await generateAnalysis({ ...req, includeCompetitors: false }, anon, '1.1.1.1');
        expect(r.ok).toBe(true);
        expect(generateResponse).toHaveBeenCalledTimes(1);
    });
    it('조사 호출이 실패하거나 출처 0건이면 학습 지식으로 저하하되 리포트 호출은 계속된다', async () => {
        vi.mocked(reports.findFreshReport).mockResolvedValue(null);
        vi.mocked(fetchWork24Summary).mockResolvedValue(null);
        vi.mocked(generateResponse).mockReset()
            .mockResolvedValueOnce({ ...researchResult, sources: [] }) // 조사했지만 출처 0건 → 저하
            .mockResolvedValue(reportResult);
        const r = await generateAnalysis(req, anon, '1.1.1.1');
        expect(r.ok).toBe(true);
        expect(generateResponse).toHaveBeenCalledTimes(2); // 조사 1 + 리포트 1(재시도 없음)
    });
    it('트렌드 OFF·해외 범위면 고용24를 호출하지 않는다', async () => {
        vi.mocked(reports.findFreshReport).mockResolvedValue(null);
        await generateAnalysis({ ...req, includeTrends: false }, anon, '1.1.1.1');
        await generateAnalysis({ ...req, scope: 'global' }, anon, '1.1.1.1');
        expect(fetchWork24Summary).not.toHaveBeenCalled();
    });
    it('한도 초과면 429', async () => {
        vi.mocked(reports.findFreshReport).mockResolvedValue(null);
        vi.mocked(checkDailyLimit).mockResolvedValue({ allowed: false, retryAfterSec: 60, message: 'x' });
        const r = await generateAnalysis(req, anon, '1.1.1.1');
        expect(!r.ok && r.status).toBe(429);
        expect(generateResponse).not.toHaveBeenCalled();
    });
    it('리포트 JSON 검증 실패 시 1회 재시도(조사는 재시도하지 않음) 후 502', async () => {
        vi.mocked(reports.findFreshReport).mockResolvedValue(null);
        vi.mocked(safeParseJSON).mockReturnValue({ broken: true });
        const r = await generateAnalysis(req, anon, '1.1.1.1');
        expect(!r.ok && r.status).toBe(502);
        expect(generateResponse).toHaveBeenCalledTimes(3); // 조사 1 + 리포트 2(최초+재시도)
    });
    it('invalid 응답이면 400이고 저장하지 않는다', async () => {
        vi.mocked(reports.findFreshReport).mockResolvedValue(null);
        vi.mocked(safeParseJSON).mockReturnValue({ invalid: true, reason: '직무가 아님' });
        const r = await generateAnalysis(req, anon, '1.1.1.1');
        expect(!r.ok && r.status).toBe(400);
        expect(reports.insertReport).not.toHaveBeenCalled();
    });
    it('테이블이 없으면 503', async () => {
        vi.mocked(reports.findFreshReport).mockRejectedValue(Object.assign(new Error('Invalid object name'), { number: 208 }));
        vi.mocked(reports.isMissingTableError).mockReturnValue(true);
        const r = await generateAnalysis(req, anon, '1.1.1.1');
        expect(!r.ok && r.status).toBe(503);
    });
    it('AI 호출은 성공했지만 리포트 저장(DB)에 실패하면 503이고 AI 연결 실패와 다른 문구를 반환한다', async () => {
        vi.mocked(reports.findFreshReport).mockResolvedValue(null);
        vi.mocked(fetchWork24Summary).mockResolvedValue(null);
        vi.mocked(reports.insertReport).mockRejectedValue(new Error('connection lost'));
        const r = await generateAnalysis(req, anon, '1.1.1.1');
        expect(!r.ok && r.status).toBe(503);
        expect(!r.ok && r.error).toContain('저장');
        expect(!r.ok && r.error).not.toBe('AI 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    });
    it('force는 관리자만 캐시를 건너뛴다', async () => {
        vi.mocked(reports.findFreshReport).mockResolvedValue(stored);
        await generateAnalysis(req, { kind: 'admin', username: 'a' }, '1.1.1.1', { force: true });
        expect(generateResponse).toHaveBeenCalledTimes(2); // 경쟁사 ON 기본 req → 조사 1 + 리포트 1
        await generateAnalysis(req, anon, '1.1.1.1', { force: true });
        expect(generateResponse).toHaveBeenCalledTimes(2); // anon force 무시 → 추가 호출 없음
    });
});
