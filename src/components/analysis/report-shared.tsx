/**
 * `ReportView.tsx`(단일 리포트)·`CompareView.tsx`(비교 리포트)가 함께 쓰는 카드 스타일·헬퍼.
 * 두 컴포넌트가 서로를 import하는 순환 의존을 피하기 위해 별도 모듈로 분리했다.
 */
import type { ReactNode } from 'react';
import type { PublicReport } from '@/lib/analysis/schema';

export const card = 'rounded-[var(--radius-card)] border border-border bg-bg-elevated p-5';
export const chip = 'h-9 inline-flex items-center px-3 rounded-full border border-border text-sm text-accent hover:bg-accent-soft';

export function daysAgoLabel(createdAt: string): string {
    const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000);
    return days <= 0 ? '오늘 생성' : `${days}일 전 생성`;
}

/** 고용24가 반영되지 않았음을 중립적으로 알린다(구체적 사유는 밝히지 않음). */
export function work24UnavailableReason(report: PublicReport): string | null {
    if (report.meta.dataUsed.includes('work24')) return null;
    return '이 리포트에는 고용24 채용 데이터가 반영되지 않았습니다.';
}

export function Badge({ children }: { children: ReactNode }) {
    return <span className="inline-flex items-center h-6 px-2 rounded-full bg-accent-soft text-accent text-xs font-semibold">{children}</span>;
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="rounded-[var(--radius-card)] border border-border bg-bg-elevated p-5 space-y-3">
            <h2 className="font-bold text-text">{title}</h2>
            {children}
        </section>
    );
}
