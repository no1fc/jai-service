/** POST /api/admin/app-users/[id]/reset-password - 로컬 계정 임시 비밀번호 발급(관리자, D-3 A안) */
import { type NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-response';
import { getClientIp } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { generateTempPassword, hashPassword } from '@/lib/analysis/auth/local';
import { getUserById, updatePassword } from '@/lib/analysis/users';
import { logAdminAccess } from '@/lib/access-log';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
    try {
        const { requireRole } = await import('@/lib/auth');
        const auth = await requireRole('admin');
        if (auth instanceof Response) return auth;

        const id = Number((await ctx.params).id);
        if (!Number.isInteger(id) || id < 1) return apiError('잘못된 ID입니다.', 400);

        const user = await getUserById(id);
        // 로컬 계정만 초기화한다(카카오 등은 비밀번호가 없음) — 둘 다 같은 404로 응답한다.
        if (!user || user.provider !== 'local') return apiError('로컬 계정을 찾을 수 없습니다.', 404);

        const tempPassword = generateTempPassword();
        const hash = await hashPassword(tempPassword);
        await updatePassword(id, hash, true);

        void logAdminAccess({ adminUsername: auth.id, action: 'app_user_reset_password', targetType: 'app_user', targetId: id, ip: getClientIp(request) });

        return apiSuccess({ tempPassword });
    } catch (error) {
        logger.error('/api/admin/app-users/[id]/reset-password 오류:', error);
        return apiError('임시 비밀번호 발급에 실패했습니다.', 500);
    }
}
