/**
 * GET /api/admin/analysis/dashboard - 상담사용 직무·산업 분석 대시보드 통계.
 * 전체 리포트 수는 `listReports`(TOP 500 고정, reports.ts 참고)의 길이로 근사한다 —
 * 500건을 넘으면 500으로 표시된다(별도 COUNT 쿼리를 추가하지 않는다, YAGNI).
 */
import { apiError, apiSuccess } from '@/lib/api-response';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const { requireRole } = await import('@/lib/auth');
        const auth = await requireRole('admin');
        if (auth instanceof Response) return auth;

        const { getDashboard, listReports } = await import('@/lib/analysis/reports');
        const [stats, reports] = await Promise.all([getDashboard(), listReports({})]);
        return apiSuccess({ stats, totalReports: reports.length });
    } catch (error) {
        logger.error('/api/admin/analysis/dashboard 오류:', error);
        return apiError('대시보드 조회에 실패했습니다.');
    }
}
