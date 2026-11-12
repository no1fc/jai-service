import { NextRequest } from 'next/server';
import { getSetting, updateSetting } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { DEFAULT_PRIVACY_POLICY } from '@/lib/privacy/policy';

/**
 * GET: 저장된 개인정보처리방침 본문과 최종 수정일 조회 (admin 이상)
 */
export async function GET() {
    try {
        const { requireRole } = await import('@/lib/auth');
        const authResult = await requireRole('admin');
        if (authResult instanceof Response) return authResult;

        const [policy, updatedAt] = await Promise.all([
            getSetting('privacy_policy'),
            getSetting('privacy_policy_updated_at'),
        ]);

        return apiSuccess({
            policy: policy || DEFAULT_PRIVACY_POLICY,
            updatedAt: updatedAt || null,
            isDefault: !policy,
        });
    } catch {
        return apiError('개인정보처리방침을 불러오는데 실패했습니다.');
    }
}

/**
 * PUT: 개인정보처리방침 본문 저장 (superadmin 전용)
 */
export async function PUT(req: NextRequest) {
    try {
        const { requireRole } = await import('@/lib/auth');
        const authResult = await requireRole('superadmin');
        if (authResult instanceof Response) return authResult;

        const { updatePrivacyPolicySchema, formatZodError } = await import('@/lib/validations');
        const rawData = await req.json();
        const parsed = updatePrivacyPolicySchema.safeParse(rawData);
        if (!parsed.success) {
            return apiError(formatZodError(parsed.error), 400);
        }

        const updatedAt = new Date().toISOString();
        const [policySaved, dateSaved] = await Promise.all([
            updateSetting('privacy_policy', parsed.data.policy),
            updateSetting('privacy_policy_updated_at', updatedAt),
        ]);

        if (!policySaved || !dateSaved) {
            return apiError('저장 중 오류가 발생했습니다.');
        }
        return apiSuccess({ updatedAt }, '개인정보처리방침이 저장되었습니다.');
    } catch {
        return apiError('서버 내부 오류가 발생했습니다.');
    }
}
