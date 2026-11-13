/** GET /api/admin/app-users?email= - 참여자 이메일 정확 일치 검색(관리자, 목록 노출 없음) */
import { type NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-response';
import { getClientIp } from '@/lib/rate-limit';
import { formatZodError } from '@/lib/validations';
import { logger } from '@/lib/logger';
import { emailSchema, maskEmail } from '@/lib/analysis/auth/local-schema';
import { isLocked } from '@/lib/analysis/auth/local';
import { findLocalUserByEmail } from '@/lib/analysis/users';
import { logAdminAccess } from '@/lib/access-log';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { requireRole } = await import('@/lib/auth');
        const auth = await requireRole('admin');
        if (auth instanceof Response) return auth;

        const parsed = emailSchema.safeParse(request.nextUrl.searchParams.get('email') ?? '');
        if (!parsed.success) return apiError(formatZodError(parsed.error), 400);

        const found = await findLocalUserByEmail(parsed.data);
        // 검색어(이메일)는 자유 텍스트 로그 필드에 남기지 않는다 — targetId(숫자)만 기록한다.
        void logAdminAccess({ adminUsername: auth.id, action: 'app_user_search', targetType: 'app_user', targetId: found?.id ?? null, ip: getClientIp(request) });

        if (!found) return apiSuccess({ user: null });

        return apiSuccess({
            user: {
                id: found.id,
                emailMasked: maskEmail(found.email ?? ''),
                provider: found.provider,
                createdAt: found.created_at,
                lastLoginAt: found.last_login_at,
                isLocked: isLocked(found.locked_until, new Date()),
            },
        });
    } catch (error) {
        logger.error('/api/admin/app-users GET 오류:', error);
        return apiError('조회에 실패했습니다.', 500);
    }
}
