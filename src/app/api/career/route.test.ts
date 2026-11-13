import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/gemini');
vi.mock('@/lib/db', () => ({ logApiUsage: vi.fn() }));
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: vi.fn(), getClientIp: vi.fn() }));

import { generateResponse, safeParseJSON } from '@/lib/gemini';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { COMMON_ITEMS } from '@/lib/career/items';
import { POST } from './route';

const star = {
    situation: '매장에서 재고 관리가 엉켜 주문이 자주 누락되는 상황이었다.',
    task: '재고 기록 방식을 바꿔 누락률을 낮추는 과제를 맡았다.',
    action: '매일 마감 시 실물과 전산 수량을 대조해 차이를 기록했다.',
    result: '한 달 뒤 주문 누락이 눈에 띄게 줄어 동료들도 방식을 따라했다.',
};
// communication_1=2, communication_2=3 → 평균 2.5 → 서버 수준은 '하'(모델이 '상'을 돌려줘도 덮어써야 한다)
const itemRatings = Object.fromEntries(COMMON_ITEMS.map((item, i) => [item.id, item.competency === 'communication' ? [2, 3][i % 2] : 3]));
const validReq = { desiredJob: '웹 개발자', experiences: [star], strengthNote: '꼼꼼함', itemRatings, jobItems: [] };

const baseDetail = { level: '중', score: 3, explanation: '설명', evidence: '근거', improvement: '보완' };
const competencyDetails = [
    { ...baseDetail, key: 'communication', level: '상', score: 5, programs: ['취업역량 강화 프로그램'] },
    { ...baseDetail, key: 'problemSolving', programs: ['일경험 프로그램'] },
    { ...baseDetail, key: 'teamwork', programs: [] },
    { ...baseDetail, key: 'selfManagement', programs: [] },
    { ...baseDetail, key: 'information', programs: [] },
    // 목록 밖 프로그램('없는프로그램')은 서버가 제거하고 허용된 프로그램만 남겨야 한다
    { ...baseDetail, key: 'jobKnowledge', programs: ['없는프로그램', '국민내일배움카드 직업훈련'] },
    { ...baseDetail, key: 'organization', programs: [] },
    { ...baseDetail, key: 'learning', programs: [] },
];
const validResult = {
    coverLetter: '자기소개서 초안입니다.',
    strengths: ['꼼꼼함'],
    gaps: ['발표 경험 부족'],
    recommendedPrograms: ['취업역량 강화 프로그램'],
    competencyDetails,
    jobFit: '직무 적합도 요약입니다.',
};

function postRequest(body: unknown) {
    return new NextRequest('http://localhost/api/career', {
        method: 'POST',
        body: typeof body === 'string' ? body : JSON.stringify(body),
        headers: { 'content-type': 'application/json' },
    });
}

function fakeAiResponse(text: string) {
    return { text, usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1, totalTokenCount: 2 }, modelName: 'gemini-test', sources: [], searchEntryPoint: null };
}

beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getClientIp).mockReturnValue('1.1.1.1');
    vi.mocked(checkRateLimit).mockReturnValue({ allowed: true, remaining: 4, resetAt: Date.now() + 1000 });
});

describe('POST /api/career', () => {
    it('rate limit에 걸리면 429를 반환하고 generateResponse를 호출하지 않는다', async () => {
        vi.mocked(checkRateLimit).mockReturnValue({ allowed: false, remaining: 0, resetAt: Date.now() + 1000 });
        const res = await POST(postRequest(validReq));
        expect(res.status).toBe(429);
        expect(generateResponse).not.toHaveBeenCalled();
    });

    it('본문 JSON이 깨지면 400을 반환한다', async () => {
        const res = await POST(postRequest('{broken'));
        expect(res.status).toBe(400);
    });

    it('모델 응답의 level/score는 서버 계산값으로 덮어쓰고, 목록 밖 프로그램은 제거한다', async () => {
        vi.mocked(generateResponse).mockResolvedValue(fakeAiResponse('ai raw text'));
        vi.mocked(safeParseJSON).mockReturnValue(validResult);

        const res = await POST(postRequest(validReq));
        expect(res.status).toBe(200);
        const json = await res.json();

        const communication = json.result.competencyDetails.find((d: { key: string }) => d.key === 'communication');
        expect(communication.score).toBe(2.5);
        expect(communication.level).toBe('하');

        const jobKnowledge = json.result.competencyDetails.find((d: { key: string }) => d.key === 'jobKnowledge');
        expect(jobKnowledge.programs).toEqual(['국민내일배움카드 직업훈련']);

        expect(generateResponse).toHaveBeenCalledTimes(1);
    });

    it('검증에 2회 실패하면 502를 반환한다', async () => {
        vi.mocked(generateResponse).mockResolvedValue(fakeAiResponse('bad'));
        vi.mocked(safeParseJSON).mockReturnValue({ bad: true });

        const res = await POST(postRequest(validReq));
        expect(res.status).toBe(502);
        expect(generateResponse).toHaveBeenCalledTimes(2);
    });
});
