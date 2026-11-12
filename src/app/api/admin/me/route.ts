import { verifyToken } from '@/lib/auth';
import type { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
    const token = request.cookies.get('admin_session')?.value;

    if (!token) {
        return apiError('인증되지 않은 요청입니다.', 401);
    }

    const payload = await verifyToken(token);

    if (!payload) {
        return apiError('세션이 만료되었습니다.', 401);
    }

    // admin_session 쿠키라도 role이 admin/superadmin이 아니면(예: user_session 토큰 재사용) 차단한다.
    const role = payload.role || 'admin';
    if (role !== 'admin' && role !== 'superadmin') {
        return apiError('관리자 권한이 필요합니다.', 403);
    }

    return apiSuccess({
        user: {
            username: payload.id,
            role,
        }
    });
}
