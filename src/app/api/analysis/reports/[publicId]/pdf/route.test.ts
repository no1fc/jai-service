import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/analysis/reports');
vi.mock('@/lib/analysis/pdf/render');
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: vi.fn(), getClientIp: vi.fn() }));

import { getReportByPublicId, toPublicReport } from '@/lib/analysis/reports';
import { pdfFileName, renderReportPdf } from '@/lib/analysis/pdf/render';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { GET } from './route';

const VALID_UUID = '123e4567-e89b-12d3-a456-426655440000';

function getRequest() {
    return new NextRequest('http://localhost/api/analysis/reports/x/pdf');
}

function ctx(publicId: string) {
    return { params: Promise.resolve({ publicId }) };
}

beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getClientIp).mockReturnValue('1.1.1.1');
    vi.mocked(checkRateLimit).mockReturnValue({ allowed: true, remaining: 9, resetAt: Date.now() + 1000 });
});

describe('GET /api/analysis/reports/[publicId]/pdf', () => {
    it('UUID 형식이 아니면 rate limit 확인 전에 404를 반환하고 DB를 호출하지 않는다(브리프 순서: uuid 검증 → rate limit)', async () => {
        const res = await GET(getRequest(), ctx('not-a-uuid'));
        expect(res.status).toBe(404);
        expect(checkRateLimit).not.toHaveBeenCalled();
        expect(getReportByPublicId).not.toHaveBeenCalled();
    });

    it('리포트가 존재하지 않으면 404를 반환한다', async () => {
        vi.mocked(getReportByPublicId).mockResolvedValue(null);
        const res = await GET(getRequest(), ctx(VALID_UUID));
        expect(res.status).toBe(404);
    });

    it('rate limit에 걸리면 429를 반환하고 DB를 호출하지 않는다', async () => {
        vi.mocked(checkRateLimit).mockReturnValue({ allowed: false, remaining: 0, resetAt: Date.now() + 1000 });
        const res = await GET(getRequest(), ctx(VALID_UUID));
        expect(res.status).toBe(429);
        expect(getReportByPublicId).not.toHaveBeenCalled();
    });

    it('PDF 렌더링이 실패하면 500이고 내부 오류 정보를 노출하지 않는다', async () => {
        vi.mocked(getReportByPublicId).mockResolvedValue({ id: 1, public_id: VALID_UUID } as never);
        vi.mocked(toPublicReport).mockReturnValue({ publicId: VALID_UUID } as never);
        vi.mocked(renderReportPdf).mockRejectedValue(new Error('ENOENT: font file missing at /srv/app/fonts'));
        const res = await GET(getRequest(), ctx(VALID_UUID));
        expect(res.status).toBe(500);
        const json = await res.json();
        expect(json.error).toBe('PDF 생성에 실패했습니다.');
        expect(JSON.stringify(json)).not.toContain('ENOENT');
        expect(JSON.stringify(json)).not.toContain('/srv/app/fonts');
    });

    it('성공하면 200과 application/pdf, RFC 5987 filename*을 반환한다', async () => {
        vi.mocked(getReportByPublicId).mockResolvedValue({ id: 1, public_id: VALID_UUID } as never);
        vi.mocked(toPublicReport).mockReturnValue({ publicId: VALID_UUID } as never);
        const pdfBuffer = Buffer.from('%PDF-1.7 fake pdf body');
        vi.mocked(renderReportPdf).mockResolvedValue(pdfBuffer);
        vi.mocked(pdfFileName).mockReturnValue('J.AI_직무분석_핀테크PM_2026-11-12.pdf');

        const res = await GET(getRequest(), ctx(VALID_UUID));

        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toBe('application/pdf');
        const disposition = res.headers.get('content-disposition') ?? '';
        expect(disposition).toContain('attachment; filename="report.pdf"');
        expect(disposition).toContain(`filename*=UTF-8''${encodeURIComponent('J.AI_직무분석_핀테크PM_2026-11-12.pdf')}`);
        const body = Buffer.from(await res.arrayBuffer());
        expect(body.equals(pdfBuffer)).toBe(true);
    });
});
