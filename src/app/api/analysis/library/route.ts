/** GET /api/analysis/library - 로그인한 참여자의 보관함 목록 */
import { apiError, apiSuccess } from '@/lib/api-response';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { getCurrentUser } from '@/lib/analysis/auth/user-session';
import { listLibrary } from '@/lib/analysis/reports';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const ip = getClientIp(request);
    const burst = checkRateLimit(`analysis:library-get:${ip}`, { maxRequests: 60, windowMs: 60 * 1000 });
    if (!burst.allowed) return apiError('요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.', 429);

    const current = await getCurrentUser();
    if (!current) return apiError('로그인이 필요합니다.', 401);

    try {
        const items = await listLibrary(current.id);
        return apiSuccess({
            items: items.map(item => ({
                publicId: item.public_id,
                type: item.type,
                keyword: item.keyword,
                createdAt: item.created_at,
            })),
        });
    } catch (error) {
        logger.error('/api/analysis/library 오류:', error);
        return apiError('보관함 조회에 실패했습니다.', 500);
    }
}
