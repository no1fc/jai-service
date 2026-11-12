/** GET /api/analysis/reports/[publicId]/pdf - 공개 리포트 PDF 다운로드 */
import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { apiError } from '@/lib/api-response';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ publicId: string }> };

const publicIdSchema = z.string().uuid();

export async function GET(request: NextRequest, ctx: Ctx) {
    const ip = getClientIp(request);
    const burst = checkRateLimit(`analysis:pdf:${ip}`, { maxRequests: 10, windowMs: 60 * 1000 });
    if (!burst.allowed) return apiError('요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.', 429);

    // DB 컬럼이 UNIQUEIDENTIFIER라 형식이 틀리면 변환 오류가 나므로 조회 전에 걸러낸다.
    // 존재 여부를 드러내지 않도록 형식 오류도 조회 실패와 같은 404로 응답한다.
    const parsed = publicIdSchema.safeParse((await ctx.params).publicId);
    if (!parsed.success) return apiError('리포트를 찾을 수 없습니다.', 404);

    try {
        const { getReportByPublicId, toPublicReport } = await import('@/lib/analysis/reports');
        const row = await getReportByPublicId(parsed.data);
        if (!row) return apiError('리포트를 찾을 수 없습니다.', 404);
        const report = toPublicReport(row);

        const { renderReportPdf, pdfFileName } = await import('@/lib/analysis/pdf/render');
        const buffer = await renderReportPdf(report);
        const name = pdfFileName(report);

        return new Response(new Uint8Array(buffer), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="report.pdf"; filename*=UTF-8''${encodeURIComponent(name)}`,
                'Cache-Control': 'private, max-age=600',
            },
        });
    } catch (error) {
        logger.error('/api/analysis/reports/[publicId]/pdf 오류:', error);
        return apiError('PDF 생성에 실패했습니다.', 500);
    }
}
