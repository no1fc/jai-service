'use client';

/** 신규 분석 생성 화면 — `?type=&keyword=`로 초기값 주입(`/career` 결과 링크용). */
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AnalysisForm from '@/components/analysis/AnalysisForm';
import { pushRecent } from '@/components/analysis/recent-reports';
import type { AnalysisRequest, PublicReport } from '@/lib/analysis/schema';

const EXAMPLE_KEYWORDS = ['핀테크 PM', 'AI 반도체', '물류 관리', '콘텐츠 마케터'];

function AnalysisPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [keywordOverride, setKeywordOverride] = useState<string | null>(null);

    const defaultType: AnalysisRequest['type'] = searchParams.get('type') === 'industry' ? 'industry' : 'job';
    const defaultKeyword = keywordOverride ?? searchParams.get('keyword') ?? '';

    function handleCreated(report: PublicReport) {
        pushRecent({ publicId: report.publicId, type: report.type, keyword: report.keyword, createdAt: report.createdAt });
        router.push(`/analysis/r/${report.publicId}`);
    }

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-xl font-bold text-text">새로운 AI 직무·산업 분석</h1>
                <p className="text-sm text-text-muted">궁금한 직무나 산업을 키워드 하나로 분석해 채용 동향·연봉·준비 로드맵을 받아보세요.</p>
            </div>
            <div className="flex flex-wrap gap-2" aria-label="예시 키워드">
                {EXAMPLE_KEYWORDS.map(k => (
                    <button key={k} type="button" onClick={() => setKeywordOverride(k)}
                        className="h-9 px-3 rounded-full border border-border text-sm text-text-secondary hover:border-accent hover:text-accent">
                        {k}
                    </button>
                ))}
            </div>
            <AnalysisForm key={defaultKeyword} defaultType={defaultType} defaultKeyword={defaultKeyword} onCreated={handleCreated} />
        </div>
    );
}

export default function AnalysisPage() {
    return (
        <Suspense fallback={null}>
            <AnalysisPageContent />
        </Suspense>
    );
}
