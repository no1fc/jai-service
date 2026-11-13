/** PUT /api/analysis/me/password - 로그인한 참여자의 비밀번호 변경(이메일 계정만) */
import { type NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-response';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { formatZodError } from '@/lib/validations';
import { logger } from '@/lib/logger';
import { changePasswordSchema } from '@/lib/analysis/auth/local-schema';
import { hashPassword, verifyPassword } from '@/lib/analysis/auth/local';
import { findLocalUserByEmail, getUserById, updatePassword } from '@/lib/analysis/users';
import { getCurrentUser } from '@/lib/analysis/auth/user-session';

export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest) {
    const ip = getClientIp(request);
    const burst = checkRateLimit(`analysis:me-password:${ip}`, { maxRequests: 10, windowMs: 15 * 60 * 1000 });
    if (!burst.allowed) return apiError('요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.', 429);

    const current = await getCurrentUser();
    if (!current) return apiError('로그인이 필요합니다.', 401);

    let body: unknown;
    try { body = await request.json(); } catch { return apiError('잘못된 요청입니다.', 400); }
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) return apiError(formatZodError(parsed.error), 400);

    try {
        const user = await getUserById(current.id);
        if (!user) return apiError('계정을 찾을 수 없습니다.', 404);
        if (user.provider !== 'local') return apiError('이메일 계정만 변경할 수 있습니다.', 400);

        // getUserById는 비공개 컬럼(password_hash)을 빼므로, 로컬 계정 전용 조회(email 기준)로 다시 가져온다.
        const local = await findLocalUserByEmail(user.email ?? '');
        if (!local?.password_hash) return apiError('현재 비밀번호가 올바르지 않습니다.', 400);

        const valid = await verifyPassword(parsed.data.currentPassword, local.password_hash);
        if (!valid) return apiError('현재 비밀번호가 올바르지 않습니다.', 400);

        const newHash = await hashPassword(parsed.data.newPassword);
        await updatePassword(current.id, newHash, false);
        return apiSuccess({});
    } catch (error) {
        logger.error('/api/analysis/me/password 오류:', error);
        return apiError('비밀번호 변경에 실패했습니다.', 500);
    }
}
