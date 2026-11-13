'use client';

/**
 * 참여자 로그인 상태(/api/analysis/me) + 로그아웃/탈퇴 — `AnalysisNav`·`library`·`me` 페이지가 공용으로 쓴다.
 * `use-library-account.ts`는 이 훅으로 로그인 상태를 받고 보관함 목록 관리만 추가로 담당한다.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export interface AccountUser {
    id: number;
    provider: string;
    email: string | null;
    createdAt: string;
    lastLoginAt: string;
    mustChangePassword: boolean;
}

export type MeState = { kind: 'loading' } | { kind: 'guest' } | { kind: 'user'; user: AccountUser };

async function fetchMe(): Promise<MeState> {
    try {
        const res = await fetch('/api/analysis/me');
        if (!res.ok) return { kind: 'guest' };
        const data = await res.json().catch(() => null);
        return data?.user ? { kind: 'user', user: data.user } : { kind: 'guest' };
    } catch {
        return { kind: 'guest' };
    }
}

export function useAccount() {
    const router = useRouter();
    const [me, setMe] = useState<MeState>({ kind: 'loading' });
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        let cancelled = false;
        fetchMe().then((state) => { if (!cancelled) setMe(state); });
        return () => { cancelled = true; };
    }, []);

    /** /api/analysis/me를 다시 조회해 me 상태를 갱신한다(예: 비밀번호 변경 후 mustChangePassword 반영). */
    async function refresh() {
        setMe(await fetchMe());
    }

    async function logout() {
        setBusy(true);
        try {
            await fetch('/api/analysis/logout', { method: 'POST' });
        } finally {
            setBusy(false);
            setMe({ kind: 'guest' });
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

    return { me, error, busy, logout, withdraw, refresh };
}
