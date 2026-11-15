/**
 * 직무/산업 분석 요청·리포트 스키마 (클라이언트/서버 공용, 런타임 의존성 zod만)
 */
import { z } from 'zod';
import { KEYWORDS_MAX, normalizeKeyword } from './keywords';

export const ANALYSIS_TYPES = ['job', 'industry'] as const;
export const ANALYSIS_SCOPES = ['kr', 'global'] as const;
export const REPORT_CACHE_TTL_DAYS = 7;
export const KEYWORD_MIN = 2;
export const KEYWORD_MAX = 50;
/** 캐시 미스(실제 생성)에만 적용하는 일일 한도 */
export const DAILY_LIMITS = { anon: 3, user: 10, admin: 30, global: 200 } as const;

export const KEYWORD_RE = /^[\p{Script=Hangul}\p{Script=Latin}0-9 /+#.&()-]+$/u;
const keywordField = z.string().trim().min(KEYWORD_MIN, '키워드는 2자 이상 입력해 주세요.').max(KEYWORD_MAX, '키워드는 50자 이내로 입력해 주세요.')
    .regex(KEYWORD_RE, '한글·영문·숫자와 일부 기호만 입력할 수 있습니다.');

/**
 * keywordField 규칙(trim 후 길이·허용 문자)을 그대로 따르는지 검사한다 — 순수 함수, 클라이언트 안전.
 * 관련 직무 칩·추천 칩이 보장된 400을 피하도록 미리 거르는 용도로 쓴다(재구현 대신 zod 스키마를 재사용).
 */
export function isValidReportKeyword(keyword: string): boolean {
    return keywordField.safeParse(keyword).success;
}

export const analysisRequestSchema = z.object({
    type: z.enum(ANALYSIS_TYPES),
    keyword: keywordField,
    scope: z.enum(ANALYSIS_SCOPES).default('kr'),
    includeCompetitors: z.boolean().default(true),
    includeTrends: z.boolean().default(true),
});
export type AnalysisRequest = z.infer<typeof analysisRequestSchema>;

/** 비교 리포트 요청(설계서 5.2) — keyword 1개 대신 keywords 2~3개. normalizeKeyword 기준 중복은 거부한다(설계서 5.1). */
export const compareRequestSchema = analysisRequestSchema.omit({ keyword: true }).extend({
    keywords: z.array(keywordField).min(2, '비교할 키워드를 2개 이상 입력해 주세요.').max(KEYWORDS_MAX, `키워드는 최대 ${KEYWORDS_MAX}개까지 비교할 수 있습니다.`),
}).superRefine((data, ctx) => {
    const seen = new Set<string>();
    data.keywords.forEach((keyword, i) => {
        const norm = normalizeKeyword(keyword);
        if (seen.has(norm)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: '중복된 키워드는 비교할 수 없습니다.', path: ['keywords', i] });
        }
        seen.add(norm);
    });
});
export type CompareRequest = z.infer<typeof compareRequestSchema>;

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

/** 비교 리포트 본문(설계서 5.3). items/criteria.values 개수는 비교 대상 키워드 수와 같아야 한다. */
const compareItemSchema = z.object({
    keyword: short, overview: para,
    mainTasks: list(5, 3), keySkills: list(5),
    salary: z.object({ entry: short, mid: short }),
    demandLevel, pros: list(3), cons: list(3),
});
const criterionSchema = z.object({ name: short, values: z.array(short).min(1) });
export const compareReportSchema = z.object({
    title: short, summary: para,
    items: z.array(compareItemSchema).min(2).max(KEYWORDS_MAX),
    comparison: z.object({
        criteria: z.array(criterionSchema).min(3).max(6),
        recommendation: para,
        fitBy: z.array(z.object({ profile: short, keyword: short, reason: para })).max(3),
    }),
    relatedJobs: list(5),
}).superRefine((data, ctx) => {
    data.comparison.criteria.forEach((c, i) => {
        if (c.values.length !== data.items.length) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'comparison.criteria.values 개수는 items 개수와 같아야 합니다.', path: ['comparison', 'criteria', i, 'values'] });
        }
    });
});
export type CompareReport = z.infer<typeof compareReportSchema>;

export const reportContentSchema = z.union([invalidKeywordSchema, jobReportSchema, industryReportSchema, compareReportSchema]);
/** 저장·표시되는 리포트 본문. invalid 응답은 generate에서 400으로 걸러져 저장되지 않으므로 포함하지 않는다. */
export type ReportContent = JobReport | IndustryReport | CompareReport;
export type ReportKind = 'single' | 'compare';

export interface Work24Summary { /* 설계서 3.1 */ total: number; sampled: number; topRegions: Array<{ region: string; count: number }>; salaryBands: Array<{ band: string; count: number }>; employmentTypes: Array<{ type: string; count: number }>; samples: Array<{ title: string; company: string; region: string; sal: string; closeDt: string; url: string }>; fetchedAt: string }
export type DataSource = 'work24' | 'search';
export interface ReportMeta { dataUsed: DataSource[]; work24: Work24Summary | null; work24ByKeyword?: Record<string, Work24Summary | null>; sources: Array<{ title: string; uri: string }>; searchEntryPoint: string | null; modelName: string }
export interface PublicReport { publicId: string; type: AnalysisRequest['type']; keyword: string; scope: AnalysisRequest['scope']; content: ReportContent; meta: ReportMeta; createdAt: string; expiresAt: string; kind: ReportKind; keywords: string[]; options: { includeCompetitors: boolean; includeTrends: boolean } }
export const ANALYSIS_TYPE_LABEL = { job: '직무 분석', industry: '산업 분석' } as const;
export const ANALYSIS_SCOPE_LABEL = { kr: '국내(대한민국)', global: '해외 포함' } as const;
