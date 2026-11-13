'use client';

/**
 * 이메일/비밀번호 로그인 폼(LoginForm 하위, 구분선 아래) — `mustChangePassword`면 `/analysis/me`로,
 * 아니면 `returnTo`로 이동한다. `returnTo`는 상위(login/page.tsx)에서 `safeReturnTo`로 이미 정리된 값이다.
 */
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { canSubmitLogin } from './login-logic';

interface EmailLoginFormProps {
    returnTo: string;
}

const inputClass = 'w-full h-11 rounded-[var(--radius-default)] border border-border bg-bg-elevated px-3 text-text';
const labelClass = 'block text-sm font-medium text-text-secondary mb-1';

export default function EmailLoginForm({ returnTo }: EmailLoginFormProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const canSubmit = canSubmitLogin(email, password, loading);

    async function onSubmit(e: FormEvent) {
        e.preventDefault();
        if (!canSubmit) return;
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/analysis/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) {
                setError(typeof data?.error === 'string' ? data.error : '로그인에 실패했습니다.');
                setLoading(false);
                return;
            }
            window.location.href = data?.user?.mustChangePassword ? '/analysis/me' : returnTo;
        } catch {
            setError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
            setLoading(false);
        }
    }

    const signupHref = `/analysis/signup?returnTo=${encodeURIComponent(returnTo)}`;

    return (
        <form onSubmit={onSubmit} className="space-y-3">
            {error && <p role="alert" className="rounded-[var(--radius-default)] border border-danger bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
            <div>
                <label htmlFor="login-email" className={labelClass}>이메일</label>
                <input id="login-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
            </div>
            <div>
                <label htmlFor="login-password" className={labelClass}>비밀번호</label>
                <input id="login-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
            </div>
            <button type="submit" disabled={!canSubmit} className="w-full h-11 rounded-[var(--radius-default)] bg-accent text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed">
                로그인
            </button>
            <p className="text-sm text-text-secondary text-center">
                아직 계정이 없나요? <Link href={signupHref} className="text-accent underline">회원가입</Link>
            </p>
        </form>
    );
}
