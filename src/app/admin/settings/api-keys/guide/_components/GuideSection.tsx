import React from 'react';

interface GuideSectionProps {
    title: string;
    icon: React.ReactNode;
    defaultOpen?: boolean;
    children: React.ReactNode;
}

/** 서비스별 안내를 `<details>/<summary>`로 접어서 화면을 훑어보기 쉽게 만든다. */
export function GuideSection({ title, icon, defaultOpen = false, children }: GuideSectionProps) {
    return (
        <details
            open={defaultOpen}
            className="bg-[var(--color-bg-elevated)] rounded-[4px] border border-[var(--color-border)] overflow-hidden mb-6 group"
        >
            <summary className="p-6 cursor-pointer list-none flex items-center gap-2 text-[var(--color-text)] font-bold text-lg [&::-webkit-details-marker]:hidden">
                {icon}
                {title}
                <span className="ml-auto text-sm font-normal text-[var(--color-text-muted)] group-open:hidden">펼치기</span>
                <span className="ml-auto text-sm font-normal text-[var(--color-text-muted)] hidden group-open:inline">접기</span>
            </summary>
            <div className="px-6 pb-6 space-y-4 text-[var(--color-text-secondary)] leading-relaxed">
                {children}
            </div>
        </details>
    );
}
