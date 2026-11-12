'use client';

/**
 * 보관함 화면의 로그인 상태·목록 조회·삭제/로그아웃/탈퇴 액션을 담당하는 훅(library/page.tsx에서 분리).
 * 로그인 상태 판정 자체는 `library-logic.ts`의 `resolveMeState`(순수 함수)를 쓴다.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { readRecent, type RecentItem } from './recent-reports';
import type { ReportRowItem } from './ReportRow';
import { resolveMeState, type MeState } from './library-logic';

export function useLibraryAccount() {
    const router = useRouter();
    const [me, setMe] = useState<MeState>({ kind: 'loading' });
    const [items, setItems] = useState<ReportRowItem[]>([]);
    const [recent, setRecent] = useState<RecentItem[]>([]);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const res = await fetch('/api/analysis/me').catch(() => null);
            const data = res ? await res.json().catch(() => null) : null;
            const state = resolveMeState(Boolean(res?.ok), data?.user);
            if (cancelled) return;
            setMe(state);
            if (state.kind === 'user') {
                const listRes = await fetch('/api/analysis/library').catch(() => null);
                const listData = listRes ? await listRes.json().catch(() => null) : null;
                if (!cancelled && listRes?.ok) setItems(listData?.items ?? []);
            } else {
                setRecent(readRecent());
            }
        })();
        return () => { cancelled = true; };
    }, []);

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

    async function logout() {
        setBusy(true);
        try {
            await fetch('/api/analysis/logout', { method: 'POST' });
        } finally {
            setBusy(false);
            router.push('/analysis');
            router.refresh();
        }
    }

    async function withdraw() {
        if (!window.confirm('탈퇴하면 보관함을 포함한 모든 정보가 삭제됩니다. 계속하시겠습니까?')) return;
        setBusy(true);
        setError('');
        try {
            const res = await fetch('/api/analysis/me', { method: 'DELETE' });
            if (!res.ok) {
                const data = await res.json().catch(() => null);
                setError(typeof data?.error === 'string' ? data.error : '탈퇴 처리에 실패했습니다.');
                return;
            }
            router.push('/analysis');
            router.refresh();
        } catch {
            setError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
        } finally {
            setBusy(false);
        }
    }

    return { me, items, recent, error, busy, removeItem, logout, withdraw };
}
