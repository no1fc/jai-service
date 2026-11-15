/** POST /api/analysis/auth/signup - 이메일/비밀번호 자체 계정 가입 */
import { type NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-response';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { formatZodError } from '@/lib/validations';
import { logger } from '@/lib/logger';
import { signupSchema } from '@/lib/analysis/auth/local-schema';
import { hashPassword } from '@/lib/analysis/auth/local';
import { createLocalUser } from '@/lib/analysis/users';
import { issueUserSession } from '@/lib/analysis/auth/user-session';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    const ip = getClientIp(request);
    const burst = checkRateLimit(`analysis:signup:${ip}`, { maxRequests: 10, windowMs: 60 * 60 * 1000 });
    if (!burst.allowed) return apiError('요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.', 429);

    let body: unknown;
    try { body = await request.json(); } catch { return apiError('잘못된 요청입니다.', 400); }
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) return apiError(formatZodError(parsed.error), 400);

    try {
        const passwordHash = await hashPassword(parsed.data.password);
        const result = await createLocalUser(parsed.data.email, passwordHash);
        if (result === 'duplicate') return apiError('이미 가입된 이메일입니다.', 409);

        const res = apiSuccess({ user: { id: result.id, provider: 'local', email: parsed.data.email } }, undefined, 201);
        await issueUserSession(res, result.id, request);
        return res;
    } catch (error) {
        logger.error('/api/analysis/auth/signup 오류:', error);
        return apiError('가입 처리에 실패했습니다.', 500);
    }
}
