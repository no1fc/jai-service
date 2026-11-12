/** GET /api/analysis/me - 로그인한 참여자 정보 조회(비로그인은 user: null) */
import { apiError, apiSuccess } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { getCurrentUser } from '@/lib/analysis/auth/user-session';
import { getUserById } from '@/lib/analysis/users';

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
