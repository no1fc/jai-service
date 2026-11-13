import React from 'react';
import { ExternalLink as ExternalLinkIcon } from 'lucide-react';

/** 외부 콘솔(카카오 디벨로퍼스, 네이버 클라우드 등)로 새 탭에서 이동하는 링크. */
export function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-accent)] underline underline-offset-2 inline-flex items-center gap-1 hover:text-[var(--color-accent-hover)]"
        >
            {children}
            <ExternalLinkIcon size={14} />
        </a>
    );
}
