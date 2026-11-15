'use client';

/**
 * 이메일/비밀번호 회원가입 폼 — 성공(201)이면 자동 로그인 상태로 `returnTo`로 이동한다.
 * `returnTo`는 상위(signup/page.tsx)에서 `safeReturnTo`로 이미 정리된 값이다.
 */
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import ConsentBlock from './ConsentBlock';
import { canSubmitSignup, isAgreed, passwordHint } from './login-logic';

interface SignupFormProps {
    returnTo: string;
}

const inputClass = 'w-full h-11 rounded-[var(--radius-default)] border border-border bg-bg-elevated px-3 text-text';
const labelClass = 'block text-sm font-medium text-text-secondary mb-1';

export default function SignupForm({ returnTo }: SignupFormProps) {
    const [consentCollect, setConsentCollect] = useState(false);
    const [consentAge, setConsentAge] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const agreed = isAgreed(consentCollect, consentAge);
    const hint = passwordHint(password);
    const canSubmit = canSubmitSignup(agreed, email, password, confirm, loading);

    async function onSubmit(e: FormEvent) {
        e.preventDefault();
        if (!canSubmit) return;
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/analysis/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, consent: true, ageConfirmed: true }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) {
                setError(typeof data?.error === 'string' ? data.error : '가입 처리에 실패했습니다.');
                setLoading(false);
                return;
            }
            window.location.href = returnTo;
        } catch {
            setError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
            setLoading(false);
        }
    }

    const loginHref = `/analysis/login?returnTo=${encodeURIComponent(returnTo)}`;

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            {error && <p role="alert" className="rounded-[var(--radius-default)] border border-danger bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
            <div>
                <label htmlFor="signup-email" className={labelClass}>이메일</label>
                <input id="signup-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
            </div>
            <div>
                <label htmlFor="signup-password" className={labelClass}>비밀번호</label>
                <input id="signup-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
                {hint && <p className="mt-1 text-xs text-text-muted">{hint}</p>}
            </div>
            <div>
                <label htmlFor="signup-password-confirm" className={labelClass}>비밀번호 확인</label>
                <input id="signup-password-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} />
            </div>
            <ConsentBlock consentCollect={consentCollect} consentAge={consentAge} onChangeCollect={setConsentCollect} onChangeAge={setConsentAge} />
            <button type="submit" disabled={!canSubmit} className="w-full h-11 rounded-[var(--radius-default)] bg-accent text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed">
                회원가입
            </button>
            <p className="text-sm text-text-secondary text-center">
                이미 계정이 있나요? <Link href={loginHref} className="text-accent underline">로그인</Link>
            </p>
        </form>
    );
}
