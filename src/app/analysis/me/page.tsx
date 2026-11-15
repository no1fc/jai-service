'use client';

/**
 * 마이페이지 — 내 정보 / 비밀번호 변경(이메일 계정만) / 내 보관함 링크 / 로그아웃·탈퇴.
 * 비로그인이면 `/analysis/login?returnTo=/analysis/me`로 보낸다.
 */
import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AccountActions from '@/components/analysis/AccountActions';
import PasswordChangeForm from '@/components/analysis/PasswordChangeForm';
import { useAccount } from '@/components/analysis/use-account';

export default function MyPage() {
    const router = useRouter();
    const { me, error, busy, logout, withdraw, refresh } = useAccount();

    useEffect(() => {
        if (me.kind === 'guest') router.replace('/analysis/login?returnTo=/analysis/me');
    }, [me.kind, router]);

    if (me.kind !== 'user') return null;
    const { user } = me;

    return (
        <div className="space-y-4">
            <h1 className="text-xl font-bold text-text">마이페이지</h1>

            {error && <p role="alert" className="rounded-[var(--radius-default)] border border-danger bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

            {user.mustChangePassword && (
                <p role="alert" className="rounded-[var(--radius-default)] border border-warning bg-warning/10 px-3 py-2 text-sm text-text">
                    임시 비밀번호로 로그인했습니다. 안전을 위해 비밀번호를 변경해 주세요.
                </p>
            )}

            <section className="rounded-[var(--radius-card)] border border-border bg-bg-elevated p-4 space-y-1 text-sm">
                <p className="font-medium text-text">내 정보</p>
                {user.email && <p className="text-text-secondary">이메일: {user.email}</p>}
                <p className="text-text-secondary">가입일: {new Date(user.createdAt).toLocaleDateString('ko-KR')}</p>
            </section>

            {user.provider === 'local' && <PasswordChangeForm onChanged={refresh} />}

            <Link href="/analysis/library" className="inline-flex items-center h-11 px-4 rounded-[var(--radius-default)] border border-border text-text font-medium hover:border-accent hover:text-accent">
                내 보관함 보기
            </Link>

            <AccountActions busy={busy} onLogout={logout} onWithdraw={withdraw} />
        </div>
    );
}
