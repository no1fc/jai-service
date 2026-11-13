'use client';

/**
 * 보관함 — 로그인 시 서버 보관함(`/api/analysis/library`), 비로그인 시 이 기기의 최근 조회(`readRecent`)를 보여준다.
 * 상태·네트워크 처리는 `use-library-account.ts` 훅에 있고, 목록 UI는 하위 컴포넌트(`LibraryList`·`RecentList`)로
 * 분리했다 — 이 페이지는 조립만 담당한다. 로그아웃·탈퇴는 `/analysis/me`(계정 관리)로 옮겼다.
 */
import Link from 'next/link';
import LibraryList from '@/components/analysis/LibraryList';
import RecentList from '@/components/analysis/RecentList';
import { useLibraryAccount } from '@/components/analysis/use-library-account';

export default function LibraryPage() {
    const { me, items, recent, error, busy, removeItem } = useLibraryAccount();

    if (me.kind === 'loading') return null;

    return (
        <div className="space-y-4">
            <h1 className="text-xl font-bold text-text">내 보관함</h1>

            {error && <p role="alert" className="rounded-[var(--radius-default)] border border-danger bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

            {me.kind === 'guest' && (
                <div className="rounded-[var(--radius-card)] border border-border bg-bg-elevated p-4 space-y-3">
                    <p className="text-sm text-text-secondary">이 기기에서 최근 본 리포트입니다. 로그인하면 어느 기기에서나 보관됩니다.</p>
                    <Link href="/analysis/login?returnTo=/analysis/library" className="inline-flex items-center h-11 px-4 rounded-[var(--radius-default)] bg-accent text-white font-bold hover:bg-accent-hover">로그인</Link>
                </div>
            )}

            {me.kind === 'guest' ? <RecentList items={recent} /> : <LibraryList items={items} busy={busy} onRemove={removeItem} />}

            {me.kind === 'user' && (
                <div className="pt-4 border-t border-border">
                    <Link href="/analysis/me" className="text-sm font-medium text-accent underline">계정 관리</Link>
                </div>
            )}
        </div>
    );
}
