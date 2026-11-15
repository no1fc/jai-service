'use client';

/**
 * 관련 직무 칩 — 클릭하면 같은 scope·옵션으로 새 분석을 즉시 생성해 이동한다(설계서 6.2).
 * `ReportView`의 "관련 직무"·산업 "유망 직무", `CompareView`의 "관련 직무"에서 쓴다.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { pushRecent, toRecentItem } from './recent-reports';
import { isValidReportKeyword } from './analysis-form-logic';
import { chip, Section } from './report-shared';
import type { AnalysisRequest, PublicReport } from '@/lib/analysis/schema';

interface RelatedJobChipsProps {
    jobs: string[];
    scope: AnalysisRequest['scope'];
    options: PublicReport['options'];
    title?: string;
}

export default function RelatedJobChips({
    jobs, scope, options, title = '비슷한 직무 — 누르면 바로 분석합니다',
}: RelatedJobChipsProps) {
    const router = useRouter();
    const [pendingJob, setPendingJob] = useState<string | null>(null);
    const [error, setError] = useState('');
    const validJobs = jobs.filter(isValidReportKeyword);

    if (validJobs.length === 0) return null;

    async function analyze(job: string) {
        setPendingJob(job);
        setError('');
        try {
            const res = await fetch('/api/analysis/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'job', keyword: job, scope,
                    includeCompetitors: options.includeCompetitors, includeTrends: options.includeTrends,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(typeof data?.error === 'string' ? data.error : '잠시 후 다시 시도해 주세요.');
                setPendingJob(null);
                return;
            }
            const report = data.report as PublicReport;
            pushRecent(toRecentItem(report));
            router.push(`/analysis/r/${report.publicId}`);
        } catch {
            setError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
            setPendingJob(null);
        }
    }

    return (
        <Section title={title}>
            <div className="flex flex-wrap gap-2">
                {validJobs.map(job => (
                    <button key={job} type="button" onClick={() => analyze(job)} disabled={pendingJob !== null}
                        aria-busy={pendingJob === job} className={`${chip} disabled:opacity-50`}>
                        {pendingJob === job ? '분석 중…' : job}
                    </button>
                ))}
            </div>
            {error && <p role="alert" className="text-danger text-sm mt-2">{error}</p>}
        </Section>
    );
}
