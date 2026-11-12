/**
 * GET /api/admin/analysis/dashboard - 상담사용 직무·산업 분석 대시보드 통계.
 * 전체 리포트 수(totalReports)는 `getDashboard()`가 `SELECT COUNT(*) FROM analysis_reports`로
 * 직접 집계한다(listReports의 TOP 500 근사를 쓰지 않는다 — 리뷰 수정).
 */
import { apiError, apiSuccess } from '@/lib/api-response';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const { requireRole } = await import('@/lib/auth');
        const auth = await requireRole('admin');
        if (auth instanceof Response) return auth;

        const { getDashboard } = await import('@/lib/analysis/reports');
        const stats = await getDashboard();
        return apiSuccess({ stats });
    } catch (error) {
        logger.error('/api/admin/analysis/dashboard 오류:', error);
        return apiError('대시보드 조회에 실패했습니다.');
    }
}
