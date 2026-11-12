/** DELETE /api/analysis/library/[publicId] - 보관함에서 리포트 제거(리포트 자체는 삭제하지 않음) */
import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { apiError, apiSuccess } from '@/lib/api-response';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { getCurrentUser } from '@/lib/analysis/auth/user-session';
import { removeFromLibrary } from '@/lib/analysis/reports';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ publicId: string }> };

const publicIdSchema = z.string().uuid();

export async function DELETE(request: NextRequest, ctx: Ctx) {
    const ip = getClientIp(request);
    const burst = checkRateLimit(`analysis:library-delete:${ip}`, { maxRequests: 30, windowMs: 60 * 1000 });
    if (!burst.allowed) return apiError('요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.', 429);

    const current = await getCurrentUser();
    if (!current) return apiError('로그인이 필요합니다.', 401);

    // DB 컬럼이 UNIQUEIDENTIFIER라 형식이 틀리면 변환 오류가 나므로 조회 전에 걸러낸다(다른 라우트와 동일하게 404).
    const parsed = publicIdSchema.safeParse((await ctx.params).publicId);
    if (!parsed.success) return apiError('리포트를 찾을 수 없습니다.', 404);

    try {
        await removeFromLibrary(current.id, parsed.data);
        return apiSuccess(null, '보관함에서 삭제했습니다.');
    } catch (error) {
        logger.error('/api/analysis/library/[publicId] 오류:', error);
        return apiError('삭제에 실패했습니다.', 500);
    }
}
