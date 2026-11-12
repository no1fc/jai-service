import { type NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/api-response';
import { LEAD_STATUSES } from '@/lib/validations';
import { maskPhone } from '@/lib/report/prompt';
import type { LeadStatus } from '@/types/lead';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { requireRole } = await import('@/lib/auth');
        const auth = await requireRole('admin');
        if (auth instanceof Response) return auth;

        const raw = request.nextUrl.searchParams.get('status');
        const status = (LEAD_STATUSES as readonly string[]).includes(raw ?? '') ? (raw as LeadStatus) : undefined;
        const { getLeads } = await import('@/lib/leads');
        const leads = (await getLeads(status)).map(({ payload: _p, report, ...l }) => ({
            ...l, phone: maskPhone(l.phone), hasReport: report !== null,
        }));
        return apiSuccess({ leads });
    } catch {
        return apiError('서버 에러가 발생했습니다.');
    }
}
