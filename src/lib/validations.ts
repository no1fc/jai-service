/**
 * Zod 입력 검증 스키마 모음
 * 모든 admin API 라우트에서 요청 바디 검증에 사용
 */

import { z } from 'zod';

// ==========================================
// Branches
// ==========================================

export const createBranchSchema = z.object({
    region_sido: z.string().min(1, '시/도를 입력해주세요.').max(50),
    region_sigungu: z.string().min(1, '시/군/구를 입력해주세요.').max(50),
    branch_name: z.string().min(1, '지점명을 입력해주세요.').max(100),
    address: z.string().min(1, '주소를 입력해주세요.').max(255),
    phone: z.string().min(1, '전화번호를 입력해주세요.').max(50),
    specific_url: z.string().min(1, 'URL을 입력해주세요.').max(500),
    latitude: z.union([z.number(), z.string().transform(Number)]).optional(),
    longitude: z.union([z.number(), z.string().transform(Number)]).optional(),
    covered_regions: z.string().max(10000).optional().default('[]'),
});

export const updateBranchSchema = z.object({
    region_sido: z.string().min(1).max(50).optional(),
    region_sigungu: z.string().min(1).max(50).optional(),
    branch_name: z.string().min(1).max(100).optional(),
    address: z.string().min(1).max(255).optional(),
    phone: z.string().min(1).max(50).optional(),
    specific_url: z.string().min(1).max(500).optional(),
    latitude: z.union([z.number(), z.string().transform(Number), z.null().transform(() => undefined)]).optional(),
    longitude: z.union([z.number(), z.string().transform(Number), z.null().transform(() => undefined)]).optional(),
    covered_regions: z.string().max(10000).optional(),
});

// ==========================================
// Admin Users
// ==========================================

export const createAdminSchema = z.object({
    username: z.string().min(3, '아이디는 3자 이상이어야 합니다.').max(100),
    password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다.').max(200),
    role: z.enum(['admin', 'superadmin']).optional().default('admin'),
});

export const updateAdminSchema = z.object({
    password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다.').max(200).optional(),
    role: z.enum(['admin', 'superadmin']).optional(),
}).refine(data => data.password || data.role, {
    message: '변경할 정보(비밀번호 또는 권한)를 입력해주세요.',
});

// ==========================================
// Login
// ==========================================

export const loginSchema = z.object({
    id: z.string().min(1, '아이디를 입력해주세요.').max(100),
    password: z.string().min(1, '비밀번호를 입력해주세요.').max(200),
});

// ==========================================
// Settings
// ==========================================

export const updateSettingSchema = z.object({
    key: z.string().min(1, '키가 유효하지 않습니다.').max(255),
    value: z.string().optional(),
    action: z.enum(['add', 'delete']).optional(),
    index: z.number().int().min(0).optional(),
});

// ==========================================
// Chat
// ==========================================

export const chatRequestSchema = z.object({
    messages: z.array(z.object({
        role: z.enum(['user', 'model']),
        content: z.string(),
    })).optional().default([]),
    phase: z.enum(['intro', 'info', 'questioning', 'analyzing', 'location', 'result', 'ended']),
    userAnswers: z.record(z.string().max(50), z.string().max(100)).optional().default({}),
    currentStep: z.number().int().min(0).optional().default(0),
});

// ==========================================
// Leads (상담 신청)
// ==========================================

export const LEAD_SOURCES = ['qna', 'diagnosis', 'career'] as const;
export const LEAD_STATUSES = ['new', 'contacted', 'enrolled', 'dropped'] as const;
const MAX_PAYLOAD_CHARS = 20000;

export const leadSchema = z.object({
    name: z.string().trim().min(2, '이름을 입력해주세요.').max(50),
    phone: z.string().trim()
        .regex(/^01[016789]-?\d{3,4}-?\d{4}$/, '휴대폰 번호 형식이 올바르지 않습니다.')
        .transform(v => v.replace(/-/g, '')),
    region: z.string().trim().min(1, '지역을 선택해주세요.').max(50),
    desiredJob: z.string().trim().max(100).optional().default(''),
    source: z.enum(LEAD_SOURCES),
    payload: z.record(z.string(), z.unknown()).default({})
        .refine(p => JSON.stringify(p).length <= MAX_PAYLOAD_CHARS, '전송 데이터가 너무 큽니다.'),
    consent: z.literal(true, { message: '개인정보 수집·이용에 동의해주세요.' }),
});

export type LeadInput = z.infer<typeof leadSchema>;

export const updateLeadStatusSchema = z.object({ status: z.enum(LEAD_STATUSES) });

// ==========================================
// Q&A 봇
// ==========================================

export const askRequestSchema = z.object({
    messages: z.array(z.object({
        role: z.enum(['user', 'model']),
        text: z.string().trim().min(1).max(500, '질문은 500자 이내로 입력해주세요.'),
    })).min(1).max(30)
        .refine(m => m[m.length - 1].role === 'user', '마지막 메시지는 질문이어야 합니다.'),
});

export const askAnswerSchema = z.object({
    answer: z.string().min(1),
    suggestDiagnosis: z.boolean().default(false),
});

// ==========================================
// 유틸리티
// ==========================================

/**
 * Zod 파싱 결과를 NextResponse 에러로 변환하는 헬퍼
 */
export function formatZodError(error: z.ZodError<unknown>): string {
    return error.issues.map(e => e.message).join(', ');
}
