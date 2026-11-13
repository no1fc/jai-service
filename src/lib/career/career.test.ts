import { describe, expect, it } from 'vitest';
import { careerRequestSchema, careerResultSchema, competencyDetailSchema } from './schema';
import { COMMON_ITEMS } from './items';

const star = {
    situation: '매장에서 재고 관리가 엉켜 주문이 자주 누락되는 상황이었다.',
    task: '재고 기록 방식을 바꿔 누락률을 낮추는 과제를 맡았다.',
    action: '매일 마감 시 실물과 전산 수량을 대조해 차이를 기록했다.',
    result: '한 달 뒤 주문 누락이 눈에 띄게 줄어 동료들도 방식을 따라했다.',
};
const itemRatings = Object.fromEntries(COMMON_ITEMS.map(item => [item.id, 3]));
const req = {
    desiredJob: '웹 개발자',
    experiences: [star],
    strengthNote: '꼼꼼함',
    itemRatings,
    jobItems: [],
};

const competencyDetail = {
    key: 'communication',
    level: '중',
    score: 3,
    explanation: '설명',
    evidence: '근거',
    improvement: '보완',
    programs: ['취업역량 강화 프로그램'],
};

describe('career request v2', () => {
    it('정상 요청을 통과시킨다', () => expect(careerRequestSchema.safeParse(req).success).toBe(true));

    it('STAR 항목이 20자 미만이면 거부한다', () => {
        const shortStar = { ...star, situation: '열아홉자리까지만채운다아아' };
        expect(shortStar.situation.length).toBeLessThan(20);
        expect(careerRequestSchema.safeParse({ ...req, experiences: [shortStar] }).success).toBe(false);
    });

    it('공통 문항 중 하나라도 응답이 빠지면 거부한다', () => {
        const rest: Record<string, number> = { ...itemRatings };
        delete rest[COMMON_ITEMS[0].id];
        expect(careerRequestSchema.safeParse({ ...req, itemRatings: rest }).success).toBe(false);
    });

    it('jobItems가 5개면 거부한다', () => {
        const jobItem = { id: 'job_1', competency: 'communication', text: '맞춤 문항 텍스트를 20자 이상으로 채운다' };
        const jobItems = [
            jobItem,
            { ...jobItem, id: 'job_2' },
            { ...jobItem, id: 'job_3' },
            { ...jobItem, id: 'job_4' },
            { ...jobItem, id: 'job_1' },
        ];
        expect(careerRequestSchema.safeParse({ ...req, jobItems }).success).toBe(false);
    });
});

describe('careerResultSchema v2', () => {
    const result = {
        coverLetter: '자기소개서 초안입니다.',
        strengths: ['꼼꼼함'],
        gaps: ['발표 경험 부족'],
        recommendedPrograms: ['취업역량 강화 프로그램'],
        jobFit: '직무 적합도 요약입니다.',
    };

    it('competencyDetails가 8개면 통과한다', () => {
        const valid = { ...result, competencyDetails: Array(8).fill(competencyDetail) };
        expect(careerResultSchema.safeParse(valid).success).toBe(true);
    });

    it('competencyDetails가 7개면 거부한다', () => {
        const invalid = { ...result, competencyDetails: Array(7).fill(competencyDetail) };
        expect(careerResultSchema.safeParse(invalid).success).toBe(false);
    });

    it('competencyDetailSchema는 역량·수준·점수·근거·프로그램을 검증한다', () => {
        expect(competencyDetailSchema.safeParse(competencyDetail).success).toBe(true);
        expect(competencyDetailSchema.safeParse({ ...competencyDetail, level: '최상' }).success).toBe(false);
    });
});
