/**
 * AI 1분 자기소개서·역량 진단 스키마 (클라이언트/서버 공용)
 */
import { z } from 'zod';
import { COMMON_ITEMS } from './items';

export const COMPETENCIES = [
    { key: 'communication', label: '의사소통' },
    { key: 'problemSolving', label: '문제해결' },
    { key: 'teamwork', label: '대인관계·협업' },
    { key: 'selfManagement', label: '자기관리' },
    { key: 'information', label: '정보·디지털 활용' },
    { key: 'jobKnowledge', label: '직무 지식' },
    { key: 'organization', label: '조직 이해' },
    { key: 'learning', label: '학습 의지' },
] as const;

export type CompetencyKey = typeof COMPETENCIES[number]['key'];
const COMPETENCY_KEYS = COMPETENCIES.map(c => c.key) as [CompetencyKey, ...CompetencyKey[]];

const rating = z.number().int().min(1, '역량 점수는 1~5 사이여야 합니다.').max(5, '역량 점수는 1~5 사이여야 합니다.');

/** STAR 경험 1건. 각 항목 20~200자. */
export const starSchema = z.object({
    situation: z.string().trim().min(20, '상황은 20자 이상 적어주세요.').max(200),
    task: z.string().trim().min(20, '과제는 20자 이상 적어주세요.').max(200),
    action: z.string().trim().min(20, '행동은 20자 이상 적어주세요.').max(200),
    result: z.string().trim().min(20, '결과는 20자 이상 적어주세요.').max(200),
});
export type Star = z.infer<typeof starSchema>;

/** 희망직무 맞춤 문항 1개. */
export const jobItemSchema = z.object({
    id: z.string().regex(/^job_[1-4]$/, '맞춤 문항 id 형식이 올바르지 않습니다.'),
    competency: z.enum(COMPETENCY_KEYS),
    text: z.string().trim().min(20, '문항은 20자 이상이어야 합니다.').max(80),
});
export type JobItem = z.infer<typeof jobItemSchema>;

export const jobItemsResponseSchema = z.object({
    items: z.array(jobItemSchema).length(4),
});

const COMMON_ITEM_IDS = COMMON_ITEMS.map(item => item.id);

export const careerRequestSchema = z.object({
    desiredJob: z.string().trim().min(1, '희망 직무를 입력해주세요.').max(100),
    experiences: z.array(starSchema).min(1, '경험을 1개 이상 입력해주세요.').max(2),
    strengthNote: z.string().trim().max(100).default(''),
    itemRatings: z.record(z.string().max(40), rating).refine(
        ratings => COMMON_ITEM_IDS.every(id => id in ratings),
        '모든 공통 문항에 응답해주세요.',
    ).refine(
        // 공통 16 + 맞춤 최대 4 = 20이 최대. 그 이상은 비정상 요청으로 거부한다.
        ratings => Object.keys(ratings).length <= 20,
        '문항 응답 수가 올바르지 않습니다.',
    ),
    jobItems: z.array(jobItemSchema).max(4).refine(
        items => new Set(items.map(i => i.id)).size === items.length,
        '맞춤 문항 id가 중복되었습니다.',
    ).default([]),
});
export type CareerRequest = z.infer<typeof careerRequestSchema>;

export const competencyDetailSchema = z.object({
    key: z.enum(COMPETENCY_KEYS),
    level: z.enum(['상', '중', '하']),
    score: z.number().min(0).max(5),
    explanation: z.string().min(1).max(300),
    evidence: z.string().min(1).max(300),
    improvement: z.string().min(1).max(300),
    programs: z.array(z.string()).max(2),
});
export type CompetencyDetail = z.infer<typeof competencyDetailSchema>;

export const careerResultSchema = z.object({
    // 리드 payload 상한(20,000자) 대비 — 결과 전체(STAR·문항 응답 포함)가 그 안에 들어오도록 자소서 본문 길이를 제한한다.
    coverLetter: z.string().min(1).max(1500),
    strengths: z.array(z.string()).max(5),
    gaps: z.array(z.string()).max(5),
    recommendedPrograms: z.array(z.string()).max(5),
    competencyDetails: z.array(competencyDetailSchema).length(8).refine(
        details => {
            const keys = details.map(d => d.key);
            return new Set(keys).size === 8 && COMPETENCY_KEYS.every(key => keys.includes(key));
        },
        '8개 역량이 중복 없이 모두 포함되어야 합니다.',
    ),
    jobFit: z.string().min(1).max(400),
});
export type CareerResult = z.infer<typeof careerResultSchema>;
