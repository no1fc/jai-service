import { describe, expect, it } from 'vitest';
import { analysisRequestSchema, jobReportSchema, industryReportSchema, reportContentSchema } from './schema';

const req = { type: 'job', keyword: '핀테크 PM', scope: 'kr', includeCompetitors: true, includeTrends: false };

describe('analysisRequestSchema', () => {
    it('정상 요청을 통과시키고 keyword를 trim한다', () => {
        const r = analysisRequestSchema.safeParse({ ...req, keyword: ' 핀테크 PM ' });
        expect(r.success).toBe(true);
        if (r.success) expect(r.data.keyword).toBe('핀테크 PM');
    });
    it('옵션 기본값은 둘 다 true다', () => {
        const r = analysisRequestSchema.parse({ type: 'industry', keyword: '이차전지', scope: 'kr' });
        expect(r.includeCompetitors).toBe(true);
        expect(r.includeTrends).toBe(true);
    });
    it('1자·51자·허용 외 문자·알 수 없는 유형은 거부한다', () => {
        expect(analysisRequestSchema.safeParse({ ...req, keyword: 'A' }).success).toBe(false);
        expect(analysisRequestSchema.safeParse({ ...req, keyword: 'a'.repeat(51) }).success).toBe(false);
        expect(analysisRequestSchema.safeParse({ ...req, keyword: '<script>' }).success).toBe(false);
        expect(analysisRequestSchema.safeParse({ ...req, type: 'company' }).success).toBe(false);
    });
});

const job = {
    title: '핀테크 PM', summary: '요약', aliases: ['프로덕트 매니저'],
    mainTasks: ['a', 'b', 'c', 'd'],
    skills: { hard: ['SQL'], soft: ['소통'], certifications: [] },
    hiring: { summary: '수요 증가', demandLevel: 'high', postingCount: 120, topRegions: ['서울'] },
    salary: { entry: '3,500~4,000만 원', mid: '5,000만 원', senior: '7,000만 원 이상', basis: '고용24 공고 기준' },
    roadmap: [{ stage: '기초', period: '1~3개월', actions: ['SQL 학습'] }, { stage: '실무', period: '3~6개월', actions: ['포트폴리오'] }, { stage: '지원', period: '6개월~', actions: ['이력서'] }],
    relatedJobs: ['서비스 기획자'],
};

describe('report schemas', () => {
    it('직무 리포트를 통과시킨다', () => expect(jobReportSchema.safeParse(job).success).toBe(true));
    it('mainTasks가 3개 미만이면 거부한다', () => {
        expect(jobReportSchema.safeParse({ ...job, mainTasks: ['a'] }).success).toBe(false);
    });
    it('invalid 응답을 union으로 받는다', () => {
        const r = reportContentSchema.safeParse({ invalid: true, reason: '직무가 아닙니다' });
        expect(r.success).toBe(true);
    });
    it('산업 리포트는 companies 5~8개를 요구한다', () => {
        const ind = {
            title: '이차전지', summary: '요약', segments: ['양극재'],
            market: { summary: '성장', keyPoints: ['a', 'b', 'c'], outlook: '긍정' },
            companies: Array.from({ length: 5 }, (_, i) => ({ name: `기업${i}`, description: '설명' })),
            hiring: { summary: '수요', demandLevel: 'medium', postingCount: null, topRegions: [], inDemandRoles: ['공정 엔지니어'] },
            promisingJobs: [{ name: '공정 엔지니어', reason: '증설' }, { name: '품질', reason: '수율' }, { name: 'BMS 개발', reason: 'SW' }],
            keywords: ['배터리'],
        };
        expect(industryReportSchema.safeParse(ind).success).toBe(true);
        expect(industryReportSchema.safeParse({ ...ind, companies: ind.companies.slice(0, 2) }).success).toBe(false);
    });
});
