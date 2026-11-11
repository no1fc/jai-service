/**
 * POST /api/leads - 상담 신청 저장 (개인정보 동의 필수)
 */
import { type NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-response';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { formatZodError, leadSchema } from '@/lib/validations';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    const limit = checkRateLimit(`leads:${getClientIp(request)}`, { maxRequests: 5, windowMs: 10 * 60 * 1000 });
    if (!limit.allowed) return apiError('요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.', 429);

    let body: unknown;
    try { body = await request.json(); } catch { return apiError('잘못된 요청입니다.', 400); }

    const parsed = leadSchema.safeParse(body);
    if (!parsed.success) return apiError(formatZodError(parsed.error), 400);

    try {
        const { insertLead } = await import('@/lib/leads');
        const id = await insertLead(parsed.data);
        return apiSuccess({ id }, '상담 신청이 접수되었습니다.', 201);
    } catch (error) {
        logger.error('/api/leads 저장 실패:', error);
        return apiError('신청 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    }
}
