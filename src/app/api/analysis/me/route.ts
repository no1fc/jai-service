/** GET /api/analysis/me - 로그인한 참여자 정보 조회(비로그인은 user: null) / DELETE - 탈퇴(보관함 포함 CASCADE 삭제) */
import { apiError, apiSuccess } from '@/lib/api-response';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { clearUserSession, getCurrentUser } from '@/lib/analysis/auth/user-session';
import { deleteUser, getUserById } from '@/lib/analysis/users';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const current = await getCurrentUser();
        if (!current) return apiSuccess({ user: null });

        const user = await getUserById(current.id);
        if (!user) return apiSuccess({ user: null });

        return apiSuccess({ user: { id: user.id, provider: user.provider, email: user.email } });
    } catch (error) {
        logger.error('/api/analysis/me 오류:', error);
        return apiError('사용자 조회에 실패했습니다.', 500);
    }
}

export async function DELETE(request: Request) {
    const ip = getClientIp(request);
    const burst = checkRateLimit(`analysis:me-delete:${ip}`, { maxRequests: 10, windowMs: 60 * 60 * 1000 });
    if (!burst.allowed) return apiError('요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.', 429);

    const current = await getCurrentUser();
    if (!current) return apiError('로그인이 필요합니다.', 401);

    try {
        await deleteUser(current.id);
        const res = apiSuccess(null, '탈퇴가 완료되었습니다.');
        clearUserSession(res);
        return res;
    } catch (error) {
        logger.error('/api/analysis/me DELETE 오류:', error);
        return apiError('탈퇴 처리에 실패했습니다.', 500);
    }
}
