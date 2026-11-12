import { type NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-response';
import { formatZodError, updateLeadStatusSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

async function authAndId(ctx: Ctx) {
    const { requireRole } = await import('@/lib/auth');
    const auth = await requireRole('admin');
    if (auth instanceof Response) return { error: auth };
    const id = Number((await ctx.params).id);
    if (!Number.isInteger(id) || id < 1) return { error: apiError('잘못된 ID입니다.', 400) };
    return { id };
}

export async function GET(_req: NextRequest, ctx: Ctx) {
    try {
        const r = await authAndId(ctx);
        if ('error' in r) return r.error;
        const { getLeadById } = await import('@/lib/leads');
        const lead = await getLeadById(r.id);
        return lead ? apiSuccess({ lead }) : apiError('신청 건을 찾을 수 없습니다.', 404);
    } catch {
        return apiError('서버 에러가 발생했습니다.');
    }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
    try {
        const r = await authAndId(ctx);
        if ('error' in r) return r.error;
        const parsed = updateLeadStatusSchema.safeParse(await req.json());
        if (!parsed.success) return apiError(formatZodError(parsed.error), 400);
        const { updateLeadStatus } = await import('@/lib/leads');
        return (await updateLeadStatus(r.id, parsed.data.status))
            ? apiSuccess(null, '상태가 변경되었습니다.')
            : apiError('신청 건을 찾을 수 없습니다.', 404);
    } catch {
        return apiError('서버 에러가 발생했습니다.');
    }
}
