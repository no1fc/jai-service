/** POST /api/analysis/logout - 참여자 로그아웃(user_session 쿠키 삭제) */
import { apiSuccess } from '@/lib/api-response';
import { clearUserSession } from '@/lib/analysis/auth/user-session';

export const dynamic = 'force-dynamic';

export async function POST() {
    const res = apiSuccess({ ok: true });
    clearUserSession(res);
    return res;
}
