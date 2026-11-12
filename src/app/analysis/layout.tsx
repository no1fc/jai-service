import type { ReactNode } from 'react';
import AnalysisNav from '@/components/analysis/AnalysisNav';

/** `/analysis/*` 공통 레이아웃 — 좌측(데스크톱)/상단(모바일) 메뉴 + 본문. */
export default function AnalysisLayout({ children }: { children: ReactNode }) {
    return (
        <div className="mx-auto max-w-5xl px-4 py-6 flex flex-col md:flex-row gap-4">
            <AnalysisNav />
            <div className="flex-1 min-w-0">{children}</div>
        </div>
    );
}
