'use client';

/**
 * 보관함 화면의 목록 조회·삭제 액션을 담당하는 훅(library/page.tsx에서 분리).
 * 로그인 상태·로그아웃·탈퇴는 `use-account.ts`의 `useAccount`를 그대로 쓴다(Task 14에서 옮김).
 */
import { useEffect, useState } from 'react';
import { readRecent, type RecentItem } from './recent-reports';
import type { ReportRowItem } from './ReportRow';
import { useAccount } from './use-account';

export function useLibraryAccount() {
    const { me, error: accountError, busy: accountBusy } = useAccount();
    const [items, setItems] = useState<ReportRowItem[]>([]);
    const [recent, setRecent] = useState<RecentItem[]>([]);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (me.kind === 'loading') return;
        if (me.kind !== 'user') {
            setRecent(readRecent());
            return;
        }
        let cancelled = false;
        (async () => {
            const listRes = await fetch('/api/analysis/library').catch(() => null);
            const listData = listRes ? await listRes.json().catch(() => null) : null;
            if (!cancelled && listRes?.ok) setItems(listData?.items ?? []);
        })();
        return () => { cancelled = true; };
    }, [me.kind]);

    async function removeItem(publicId: string) {
        setBusy(true);
        setError('');
        try {
            const res = await fetch(`/api/analysis/library/${publicId}`, { method: 'DELETE' });
            if (!res.ok) {
                const data = await res.json().catch(() => null);
                setError(typeof data?.error === 'string' ? data.error : '삭제에 실패했습니다.');
                return;
            }
            setItems((prev) => prev.filter((item) => item.publicId !== publicId));
        } catch {
            setError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
        } finally {
            setBusy(false);
        }
    }

    return {
        me,
        items,
        recent,
        error: error || accountError,
        busy: busy || accountBusy,
        removeItem,
    };
}
