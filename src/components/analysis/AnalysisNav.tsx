'use client';

/**
 * `/analysis/*` 좌측 메뉴(데스크톱) / 상단 탭(모바일) — 신규 분석·내 보관함 + 로그인 상태.
 * 로그인 상태·로그아웃은 `use-account.ts`의 `useAccount`를 쓴다.
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAccount } from './use-account';

const MENU = [
    { href: '/analysis', label: '신규 분석' },
    { href: '/analysis/library', label: '내 보관함' },
];

export default function AnalysisNav() {
    const pathname = usePathname();
    const { me, busy, logout } = useAccount();

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
            <div className="md:mt-2 md:pt-2 md:border-t md:border-border shrink-0 flex md:flex-col gap-1">
                {me.kind === 'user' ? (
                    <>
                        <Link href="/analysis/me" aria-current={pathname === '/analysis/me' ? 'page' : undefined} className={itemClass(pathname === '/analysis/me')}>마이페이지</Link>
                        <button type="button" disabled={busy} onClick={logout} className={`${itemClass(false)} w-full md:w-auto disabled:opacity-50 disabled:cursor-not-allowed`}>로그아웃</button>
                    </>
                ) : (
                    <Link href="/analysis/login" className={itemClass(false)}>로그인</Link>
                )}
            </div>
        </nav>
    );
}
