'use client';

/**
 * 관리자 "참여자 계정" — 이메일 정확 일치 검색 → 결과 카드 → 임시 비밀번호 발급(1회 표시, 모달 없음).
 * 인증은 middleware.ts(admin_session)가 라우트 단위로 처리하므로 이 페이지는 별도 가드를 두지 않는다.
 */
import { useState, type FormEvent } from 'react';
import { Check, Copy, KeyRound, Search } from 'lucide-react';
import { emailSchema } from '@/lib/analysis/auth/local-schema';

interface AppUserResult {
    id: number;
    emailMasked: string;
    provider: string;
    lastLoginAt: string;
    isLocked: boolean;
}

function unlock(user: AppUserResult): AppUserResult {
    return { ...user, isLocked: false };
}

const inputClass = 'h-11 flex-1 rounded-[4px] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 text-[var(--color-text)]';
const btn = 'h-11 px-4 rounded-[4px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed';

export default function AdminAppUsersPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState<AppUserResult | 'not-found' | null>(null);
    const [tempPassword, setTempPassword] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [resetBusy, setResetBusy] = useState(false);

    async function onSearch(e: FormEvent) {
        e.preventDefault();
        setResult(null);
        setTempPassword(null);
        setCopied(false);
        const parsed = emailSchema.safeParse(email);
        if (!parsed.success) { setError('이메일 형식이 올바르지 않습니다.'); return; }
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`/api/admin/app-users?email=${encodeURIComponent(parsed.data)}`);
            const data = await res.json().catch(() => null);
            if (!res.ok) { setError(typeof data?.error === 'string' ? data.error : '조회에 실패했습니다.'); return; }
            setResult(data.user ?? 'not-found');
        } catch {
            setError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
        } finally {
            setLoading(false);
        }
    }

    async function onResetPassword() {
        if (!result || result === 'not-found') return;
        setResetBusy(true);
        setError('');
        try {
            const res = await fetch(`/api/admin/app-users/${result.id}/reset-password`, { method: 'POST' });
            const data = await res.json().catch(() => null);
            if (!res.ok) { setError(typeof data?.error === 'string' ? data.error : '임시 비밀번호 발급에 실패했습니다.'); return; }
            setTempPassword(data.tempPassword);
            // 비밀번호 초기화는 서버에서 failed_attempts·locked_until도 함께 초기화한다(users.ts updatePassword) — 카드에도 반영한다.
            setResult((prev) => (prev && prev !== 'not-found' ? unlock(prev) : prev));
        } catch {
            setError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
        } finally {
            setResetBusy(false);
        }
    }

    async function onCopy() {
        if (!tempPassword) return;
        try {
            await navigator.clipboard.writeText(tempPassword);
            setCopied(true);
        } catch {
            setError('복사에 실패했습니다. 직접 선택해 복사해 주세요.');
        }
    }

    function onCloseTempPassword() {
        setTempPassword(null);
        setCopied(false);
    }

    return (
        <div className="space-y-6 max-w-lg">
            <div>
                <h1 className="text-2xl font-bold text-[var(--color-text)]">참여자 계정</h1>
                <p className="text-[var(--color-text-muted)] mt-1">이메일로 참여자 계정을 조회하고 임시 비밀번호를 발급합니다.</p>
            </div>

            <form onSubmit={onSearch} className="flex gap-2">
                <label htmlFor="app-user-email" className="sr-only">참여자 이메일</label>
                <input id="app-user-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="참여자 이메일" className={inputClass} />
                <button type="submit" disabled={loading} className={`${btn} bg-[var(--color-accent)] text-white flex items-center gap-2`}>
                    <Search size={16} /> 검색
                </button>
            </form>

            {error && <p role="alert" className="text-sm text-[var(--color-danger)]">{error}</p>}

            {result === 'not-found' && <p className="text-sm text-[var(--color-text-muted)]">해당 이메일의 계정을 찾을 수 없습니다.</p>}

            {result && result !== 'not-found' && (
                <div className="rounded-[4px] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4 space-y-2">
                    <p className="text-[var(--color-text)] font-medium">{result.emailMasked}</p>
                    <p className="text-sm text-[var(--color-text-muted)]">
                        가입: {result.provider === 'local' ? '이메일' : result.provider} · 마지막 로그인: {new Date(result.lastLoginAt).toLocaleString('ko-KR')}
                    </p>
                    {result.isLocked && <p className="text-sm text-[var(--color-danger)]">로그인 실패 누적으로 잠겨 있습니다.</p>}

                    {result.provider !== 'local' ? (
                        <p className="text-sm text-[var(--color-text-muted)]">이메일 계정이 아니라 비밀번호를 초기화할 수 없습니다.</p>
                    ) : tempPassword ? (
                        <div className="space-y-2 rounded-[4px] border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5 p-3">
                            <p className="text-sm text-[var(--color-text-secondary)]">임시 비밀번호(1회만 표시됩니다):</p>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 h-11 flex items-center px-3 rounded-[4px] bg-[var(--color-bg)] text-[var(--color-text)] font-mono text-sm overflow-x-auto">{tempPassword}</code>
                                <button type="button" onClick={onCopy} className={`${btn} border border-[var(--color-border)] text-[var(--color-text-secondary)] flex items-center gap-1`}>
                                    {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? '복사됨' : '복사'}
                                </button>
                            </div>
                            <button type="button" onClick={onCloseTempPassword} className={`${btn} w-full bg-[var(--color-text)] text-white`}>
                                참여자에게 전달 후 닫기
                            </button>
                        </div>
                    ) : (
                        <button type="button" disabled={resetBusy} onClick={onResetPassword} className={`${btn} border border-[var(--color-accent)] text-[var(--color-accent)] flex items-center gap-2`}>
                            <KeyRound size={16} /> 임시 비밀번호 발급
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
