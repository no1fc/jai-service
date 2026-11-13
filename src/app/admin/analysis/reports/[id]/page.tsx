'use client';

/** 상담사용 리포트 상세 — ReportView 재사용 + 요청 이력 + "같은 조건으로 재생성". */
import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ReportView from '@/components/analysis/ReportView';
import { logger } from '@/lib/logger';
import type { PublicReport } from '@/lib/analysis/schema';

interface RequestSummary { count: number; lastRequestedAt: string | null }
interface DetailData { report: PublicReport; id: number; includeCompetitors: boolean; includeTrends: boolean; requestSummary: RequestSummary }

const card = 'bg-[var(--color-bg-elevated)] rounded-[4px] border border-[var(--color-border)] p-6';

export default function AdminAnalysisReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [data, setData] = useState<DetailData | null>(null);
    const [error, setError] = useState('');
    const [regenerating, setRegenerating] = useState(false);

    useEffect(() => {
        fetch(`/api/admin/analysis/reports/${id}`)
            .then(r => r.json())
            .then(d => (d.success ? setData(d) : setError(d.error)))
            .catch(err => {
                logger.error('리포트 상세 조회 실패:', err);
                setError('리포트를 불러오지 못했습니다.');
            });
    }, [id]);

    async function regenerate() {
        if (!data) return;
        setRegenerating(true);
        setError('');
        try {
            const res = await fetch('/api/admin/analysis/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: data.report.type, keyword: data.report.keyword, scope: data.report.scope,
                    includeCompetitors: data.includeCompetitors, includeTrends: data.includeTrends, force: true,
                }),
            });
            const d = await res.json();
            if (!d.success) throw new Error(d.error);
            router.push(`/admin/analysis/reports/${d.id}`);
        } catch (e) {
            setError(e instanceof Error ? e.message : '재생성에 실패했습니다.');
        } finally {
            setRegenerating(false);
        }
    }

    if (error && !data) return <p role="alert" className="text-[var(--color-danger)]">{error}</p>;
    if (!data) return <p className="text-[var(--color-text-muted)]">불러오는 중...</p>;

    return (
        <div className="max-w-3xl space-y-4">
            <Link href="/admin/analysis/reports" className="text-sm text-[var(--color-text-secondary)] underline">← 보관함</Link>

            <div className={`${card} flex items-center justify-between gap-3 flex-wrap`}>
                <div>
                    <h2 className="font-bold text-[var(--color-text)]">요청 이력</h2>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                        총 {data.requestSummary.count}건
                        {data.requestSummary.lastRequestedAt && ` · 최근 요청 ${new Date(data.requestSummary.lastRequestedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`}
                    </p>
                </div>
                <button type="button" onClick={regenerate} disabled={regenerating}
                    className="h-11 px-4 rounded-[4px] bg-[var(--color-accent)] text-white font-semibold disabled:opacity-50">
                    {regenerating ? '재생성 중...' : '같은 조건으로 재생성'}
                </button>
            </div>

            {error && <p role="alert" className="text-[var(--color-danger)]">{error}</p>}

            <ReportView report={data.report} pdfHref={`/api/analysis/reports/${data.report.publicId}/pdf`} />
        </div>
    );
}
