/**
 * AI 1분 자기소개서·역량 진단 스키마 (클라이언트/서버 공용)
 */
import { z } from 'zod';

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

const rating = z.number().int().min(1, '역량 점수는 1~5 사이여야 합니다.').max(5, '역량 점수는 1~5 사이여야 합니다.');
const ratingsShape = Object.fromEntries(COMPETENCIES.map(c => [c.key, rating])) as Record<CompetencyKey, typeof rating>;

export const careerRequestSchema = z.object({
    desiredJob: z.string().trim().min(1, '희망 직무를 입력해주세요.').max(100),
    experience: z.string().trim().min(10, '경험을 10자 이상 적어주세요.').max(600),
    ratings: z.object(ratingsShape),
});
export type CareerRequest = z.infer<typeof careerRequestSchema>;

export const careerResultSchema = z.object({
    coverLetter: z.string().min(1),
    strengths: z.array(z.string()).max(5),
    gaps: z.array(z.string()).max(5),
    recommendedPrograms: z.array(z.string()).max(5),
});
export type CareerResult = z.infer<typeof careerResultSchema>;
