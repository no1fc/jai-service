'use client';

/**
 * 보관함 — 로그인 시 서버 보관함(`/api/analysis/library`), 비로그인 시 이 기기의 최근 조회(`readRecent`)를 보여준다.
 * 로그인한 참여자는 하단에서 로그아웃·탈퇴(보관함 포함 삭제)를 할 수 있다.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { readRecent, type RecentItem } from '@/components/analysis/recent-reports';
import { ANALYSIS_TYPE_LABEL, type AnalysisRequest } from '@/lib/analysis/schema';

interface LibraryItem { publicId: string; type: AnalysisRequest['type']; keyword: string; createdAt: string }

type MeState = { kind: 'loading' } | { kind: 'guest' } | { kind: 'user' };

const card = 'rounded-[var(--radius-card)] border border-border bg-bg-elevated p-4';
const rowButton = 'h-11 px-3 rounded-[var(--radius-default)] text-sm font-medium border border-border text-text-secondary hover:border-accent hover:text-accent';

function Badge({ type }: { type: AnalysisRequest['type'] }) {
    return <span className="inline-flex items-center h-6 px-2 rounded-full bg-accent-soft text-accent text-xs font-semibold">{ANALYSIS_TYPE_LABEL[type]}</span>;
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

async function fetchMe(): Promise<MeState> {
    try {
        const res = await fetch('/api/analysis/me');
        if (!res.ok) return { kind: 'guest' };
        const data = await res.json();
        return data?.user ? { kind: 'user' } : { kind: 'guest' };
    } catch {
        return { kind: 'guest' };
    }
}

export default function LibraryPage() {
    const router = useRouter();
    const [me, setMe] = useState<MeState>({ kind: 'loading' });
    const [items, setItems] = useState<LibraryItem[]>([]);
    const [recent, setRecent] = useState<RecentItem[]>([]);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        let cancelled = false;
        fetchMe().then(async (state) => {
            if (cancelled) return;
            setMe(state);
            if (state.kind === 'user') {
                try {
                    const res = await fetch('/api/analysis/library');
                    const data = await res.json();
                    if (!cancelled && res.ok) setItems(data.items ?? []);
                } catch {
                    // 목록 조회 실패는 빈 목록으로 조용히 저하된다 — 아래 에러 배너 대신 재진입으로 유도.
                }
            } else {
                setRecent(readRecent());
            }
        });
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

    if (me.kind === 'loading') return null;

    return (
        <div className="space-y-4">
            <h1 className="text-xl font-bold text-text">내 보관함</h1>

            {error && <p role="alert" className="rounded-[var(--radius-default)] border border-danger bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

            {me.kind === 'guest' && (
                <div className={`${card} space-y-3`}>
                    <p className="text-sm text-text-secondary">이 기기에서 최근 본 리포트입니다. 로그인하면 어느 기기에서나 보관됩니다.</p>
                    <Link href="/analysis/login?returnTo=/analysis/library" className="inline-flex items-center h-11 px-4 rounded-[var(--radius-default)] bg-accent text-white font-bold hover:bg-accent-hover">로그인</Link>
                </div>
            )}

            {(me.kind === 'guest' ? recent : items).length === 0 ? (
                <p className="text-sm text-text-muted">{me.kind === 'guest' ? '최근 본 리포트가 없습니다.' : '보관함이 비어 있습니다.'}</p>
            ) : (
                <ul className="space-y-2">
                    {(me.kind === 'guest' ? recent : items).map((item) => (
                        <li key={item.publicId} className={`${card} flex flex-wrap items-center gap-3`}>
                            <Badge type={item.type} />
                            <span className="flex-1 min-w-0 truncate text-text font-medium">{item.keyword}</span>
                            <span className="text-xs text-text-muted">{formatDate(item.createdAt)}</span>
                            <Link href={`/analysis/r/${item.publicId}`} className={rowButton}>보기</Link>
                            {me.kind === 'user' && (
                                <button type="button" disabled={busy} onClick={() => removeItem(item.publicId)} className={rowButton}>삭제</button>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {me.kind === 'user' && (
                <div className="pt-4 border-t border-border flex flex-wrap gap-2">
                    <button type="button" disabled={busy} onClick={logout} className={rowButton}>로그아웃</button>
                    <button type="button" disabled={busy} onClick={withdraw} className={`${rowButton} border-danger text-danger hover:border-danger-hover hover:text-danger-hover`}>탈퇴(보관함 포함 삭제)</button>
                </div>
            )}
        </div>
    );
}
