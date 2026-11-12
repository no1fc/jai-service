'use client';

/**
 * `/analysis/*` 좌측 메뉴(데스크톱) / 상단 탭(모바일) — 신규 분석·내 보관함 + 로그인 상태.
 * `/api/analysis/me`는 Task 7에서 구현되므로 404/401/네트워크 오류는 모두 "로그인" 상태로 처리한다.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const MENU = [
    { href: '/analysis', label: '신규 분석' },
    { href: '/analysis/library', label: '내 보관함' },
];

type MeState = { kind: 'loading' } | { kind: 'guest' } | { kind: 'user'; email: string | null };

async function fetchMe(): Promise<MeState> {
    try {
        const res = await fetch('/api/analysis/me');
        if (!res.ok) return { kind: 'guest' };
        const data = await res.json();
        return data?.user ? { kind: 'user', email: data.user.email ?? null } : { kind: 'guest' };
    } catch {
        return { kind: 'guest' };
    }
}

export default function AnalysisNav() {
    const pathname = usePathname();
    const [me, setMe] = useState<MeState>({ kind: 'loading' });

    useEffect(() => {
        let cancelled = false;
        fetchMe().then(state => { if (!cancelled) setMe(state); });
        return () => { cancelled = true; };
    }, []);

    async function logout() {
        try {
            await fetch('/api/analysis/logout', { method: 'POST' });
        } finally {
            setMe({ kind: 'guest' });
        }
    }

    const itemClass = (active: boolean) =>
        `min-h-11 flex items-center px-3 rounded-[var(--radius-default)] text-sm font-medium whitespace-nowrap ${
            active ? 'bg-accent-soft text-accent' : 'text-text-secondary hover:text-text'}`;

    return (
        <nav aria-label="직무·산업 분석 메뉴" className="flex md:flex-col gap-1 overflow-x-auto md:w-56 md:shrink-0 bg-bg-elevated border border-border rounded-[var(--radius-card)] p-2">
            {MENU.map(item => (
                <Link key={item.href} href={item.href} aria-current={pathname === item.href ? 'page' : undefined} className={itemClass(pathname === item.href)}>
                    {item.label}
                </Link>
            ))}
            <div className="md:mt-2 md:pt-2 md:border-t md:border-border shrink-0">
                {me.kind === 'user' ? (
                    <button type="button" onClick={logout} className={`${itemClass(false)} w-full md:w-auto`}>로그아웃</button>
                ) : (
                    <Link href="/analysis/login" className={itemClass(false)}>로그인</Link>
                )}
            </div>
        </nav>
    );
}
