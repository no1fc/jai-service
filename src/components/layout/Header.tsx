'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
    { href: '/ask', label: 'Q&A 상담' },
    { href: '/chat', label: '모의진단' },
    { href: '/career', label: '자소서·역량' },
];

export default function Header() {
    const pathname = usePathname();
    if (pathname.startsWith('/admin')) return null;

    return (
        <header className="sticky top-0 z-40 bg-bg-elevated/95 border-b border-border">
            <div className="mx-auto max-w-5xl h-14 px-4 flex items-center justify-between gap-4">
                <Link href="/" className="flex items-center gap-2 min-h-11 py-1" aria-label="J.AI 홈">
                    <span className="w-8 h-8 rounded-[var(--radius-default)] bg-accent text-white font-bold text-sm flex items-center justify-center">J</span>
                    <span className="font-bold text-text text-lg tracking-tight">J.AI</span>
                </Link>
                <nav aria-label="주요 서비스" className="flex items-center gap-1 overflow-x-auto">
                    {NAV.map(item => (
                        <Link
                            key={item.href}
                            href={item.href}
                            aria-current={pathname === item.href ? 'page' : undefined}
                            className={`whitespace-nowrap min-h-11 inline-flex items-center px-3 py-2 rounded-[var(--radius-default)] text-sm font-medium transition-colors ${
                                pathname === item.href ? 'bg-accent-soft text-accent' : 'text-text-secondary hover:text-text'
                            }`}
                        >
                            {item.label}
                        </Link>
                    ))}
                </nav>
                <a href="http://www.jobmoa.com/" target="_blank" rel="noopener noreferrer" className="hidden sm:inline-flex min-h-11 min-w-11 items-center justify-center shrink-0" aria-label="잡모아 홈페이지">
                    <img src="/JobmoaLogo.svg" alt="잡모아" className="h-6 w-auto" />
                </a>
            </div>
        </header>
    );
}
