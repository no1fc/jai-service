/**
 * 직무/산업 분석 요청·리포트 스키마 (클라이언트/서버 공용, 런타임 의존성 zod만)
 */
import { z } from 'zod';

export const ANALYSIS_TYPES = ['job', 'industry'] as const;
export const ANALYSIS_SCOPES = ['kr', 'global'] as const;
export const REPORT_CACHE_TTL_DAYS = 7;
export const KEYWORD_MIN = 2;
export const KEYWORD_MAX = 50;
/** 캐시 미스(실제 생성)에만 적용하는 일일 한도 */
export const DAILY_LIMITS = { anon: 3, user: 10, admin: 30, global: 200 } as const;

const KEYWORD_RE = /^[\p{Script=Hangul}\p{Script=Latin}0-9 /+#.&()-]+$/u;

export const analysisRequestSchema = z.object({
    type: z.enum(ANALYSIS_TYPES),
    keyword: z.string().trim().min(KEYWORD_MIN, '키워드는 2자 이상 입력해 주세요.').max(KEYWORD_MAX, '키워드는 50자 이내로 입력해 주세요.')
        .regex(KEYWORD_RE, '한글·영문·숫자와 일부 기호만 입력할 수 있습니다.'),
    scope: z.enum(ANALYSIS_SCOPES).default('kr'),
    includeCompetitors: z.boolean().default(true),
    includeTrends: z.boolean().default(true),
});
export type AnalysisRequest = z.infer<typeof analysisRequestSchema>;

const short = z.string().trim().min(1).max(200);
const para = z.string().trim().min(1).max(800);
const list = (max: number, min = 0) => z.array(short).min(min).max(max);
const demandLevel = z.enum(['high', 'medium', 'low']);
const hiringBase = {
    summary: para,
    demandLevel,
    postingCount: z.number().int().nonnegative().nullable(),
    topRegions: list(5),
};

export const jobReportSchema = z.object({
    title: short, summary: para, aliases: list(5),
    mainTasks: list(7, 3),
    skills: z.object({ hard: list(6), soft: list(6), certifications: list(6) }),
    hiring: z.object(hiringBase),
    salary: z.object({ entry: short, mid: short, senior: short, basis: para }),
    roadmap: z.array(z.object({ stage: short, period: short, actions: list(5, 1) })).min(3).max(4),
    relatedJobs: list(5),
});
export type JobReport = z.infer<typeof jobReportSchema>;

export const industryReportSchema = z.object({
    title: short, summary: para, segments: list(6),
    market: z.object({ summary: para, keyPoints: list(5, 3), outlook: para }),
    companies: z.array(z.object({ name: short, description: para, note: short.optional() })).min(5).max(8),
    hiring: z.object({ ...hiringBase, inDemandRoles: list(6) }),
    promisingJobs: z.array(z.object({ name: short, reason: para })).min(3).max(6),
    keywords: list(8),
});
export type IndustryReport = z.infer<typeof industryReportSchema>;

export const invalidKeywordSchema = z.object({ invalid: z.literal(true), reason: short });
export const reportContentSchema = z.union([invalidKeywordSchema, jobReportSchema, industryReportSchema]);
export type ReportContent = JobReport | IndustryReport;

export interface Work24Summary { /* 설계서 3.1 */ total: number; sampled: number; topRegions: Array<{ region: string; count: number }>; salaryBands: Array<{ band: string; count: number }>; employmentTypes: Array<{ type: string; count: number }>; samples: Array<{ title: string; company: string; region: string; sal: string; closeDt: string; url: string }>; fetchedAt: string }
export type DataSource = 'work24' | 'search';
export interface ReportMeta { dataUsed: DataSource[]; work24: Work24Summary | null; sources: Array<{ title: string; uri: string }>; searchEntryPoint: string | null; modelName: string }
export interface PublicReport { publicId: string; type: AnalysisRequest['type']; keyword: string; scope: AnalysisRequest['scope']; content: ReportContent; meta: ReportMeta; createdAt: string; expiresAt: string }
export const ANALYSIS_TYPE_LABEL = { job: '직무 분석', industry: '산업 분석' } as const;
export const ANALYSIS_SCOPE_LABEL = { kr: '국내(대한민국)', global: '해외 포함' } as const;
