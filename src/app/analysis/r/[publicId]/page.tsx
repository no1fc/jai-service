import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import ReportView from '@/components/analysis/ReportView';
import { ANALYSIS_TYPE_LABEL } from '@/lib/analysis/schema';
import { getReportByPublicId, toPublicReport, type StoredReport } from '@/lib/analysis/reports';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ publicId: string }> };

const publicIdSchema = z.string().uuid();

// DB 컬럼이 UNIQUEIDENTIFIER라 형식이 틀린 값을 그대로 넘기면 변환 오류가 나므로 조회 전에 걸러낸다.
async function loadReport(publicId: string): Promise<StoredReport | null> {
    const parsed = publicIdSchema.safeParse(publicId);
    if (!parsed.success) return null;
    return getReportByPublicId(parsed.data);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const row = await loadReport((await params).publicId);
    if (!row) return { title: '리포트를 찾을 수 없습니다 | J.AI' };
    return { title: `${row.keyword} ${ANALYSIS_TYPE_LABEL[row.type]} | J.AI` };
}

/** 공개 분석 리포트 결과 — 공유 가능한 UUID 링크. */
export default async function AnalysisReportPage({ params }: Props) {
    const { publicId } = await params;
    const row = await loadReport(publicId);
    if (!row) notFound();

    return <ReportView report={toPublicReport(row)} pdfHref={`/api/analysis/reports/${publicId}/pdf`} />;
}
