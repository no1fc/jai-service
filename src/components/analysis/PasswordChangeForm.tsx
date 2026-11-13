'use client';

/** 로그인한 참여자(이메일 계정)의 비밀번호 변경 폼 — me/page.tsx 하위. 성공 시 onChanged로 상위에 알린다. */
import { useState, type FormEvent } from 'react';
import { passwordSchema } from '@/lib/analysis/auth/local-schema';
import { passwordHint } from './login-logic';

interface PasswordChangeFormProps {
    onChanged?: () => void;
}

const inputClass = 'w-full h-11 rounded-[var(--radius-default)] border border-border bg-bg-elevated px-3 text-text';
const labelClass = 'block text-sm font-medium text-text-secondary mb-1';

export default function PasswordChangeForm({ onChanged }: PasswordChangeFormProps) {
    const [current, setCurrent] = useState('');
    const [next, setNext] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const hint = passwordHint(next);
    const canSubmit = !loading && current.length > 0 && passwordSchema.safeParse(next).success && next === confirm && next !== current;

    async function onSubmit(e: FormEvent) {
        e.preventDefault();
        if (!canSubmit) return;
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const res = await fetch('/api/analysis/me/password', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword: current, newPassword: next }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) {
                setError(typeof data?.error === 'string' ? data.error : '비밀번호 변경에 실패했습니다.');
                return;
            }
            setSuccess('비밀번호가 변경되었습니다.');
            setCurrent('');
            setNext('');
            setConfirm('');
            onChanged?.();
        } catch {
            setError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={onSubmit} className="rounded-[var(--radius-card)] border border-border bg-bg-elevated p-4 space-y-3">
            <p className="font-medium text-text">비밀번호 변경</p>
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
            {success && <p role="status" className="text-sm text-success">{success}</p>}
            <div>
                <label htmlFor="current-password" className={labelClass}>현재 비밀번호</label>
                <input id="current-password" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className={inputClass} />
            </div>
            <div>
                <label htmlFor="new-password" className={labelClass}>새 비밀번호</label>
                <input id="new-password" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className={inputClass} />
                {hint && <p className="mt-1 text-xs text-text-muted">{hint}</p>}
            </div>
            <div>
                <label htmlFor="new-password-confirm" className={labelClass}>새 비밀번호 확인</label>
                <input id="new-password-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} />
            </div>
            <button type="submit" disabled={!canSubmit} className="w-full h-11 rounded-[var(--radius-default)] bg-accent text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed">
                변경
            </button>
        </form>
    );
}
