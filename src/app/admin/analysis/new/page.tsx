'use client';

/** 상담사용 신규 분석 생성 화면 — 대시보드 TOP 10 링크의 `?type=&keyword=`로 초기값을 받는다. */
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AnalysisForm from '@/components/analysis/AnalysisForm';
import type { AnalysisRequest } from '@/lib/analysis/schema';

function AdminNewAnalysisContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const defaultType: AnalysisRequest['type'] = searchParams.get('type') === 'industry' ? 'industry' : 'job';
    const defaultKeyword = searchParams.get('keyword') ?? '';

    return (
        <div className="max-w-xl space-y-4">
            <Link href="/admin/analysis" className="text-sm text-[var(--color-text-secondary)] underline">← 대시보드</Link>
            <h1 className="text-2xl font-bold text-[var(--color-text)]">신규 분석 생성</h1>
            <AnalysisForm
                defaultType={defaultType}
                defaultKeyword={defaultKeyword}
                endpoint="/api/admin/analysis/reports"
                allowForce
                onCreated={(_report, _cached, id) => { if (id !== undefined) router.push(`/admin/analysis/reports/${id}`); }}
            />
        </div>
    );
}

export default function AdminNewAnalysisPage() {
    return (
        <Suspense fallback={null}>
            <AdminNewAnalysisContent />
        </Suspense>
    );
}
