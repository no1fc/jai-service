'use client';

/**
 * 휴대폰 인증 단계(번호 입력 → 발송 → 코드 확인)의 상태와 네트워크 호출을 담당하는 훅.
 * 판단 로직 자체는 `login-logic.ts`의 순수 함수를 그대로 쓴다(LoginForm에서 분리).
 */
import { useEffect, useRef, useState } from 'react';
import { nextPhoneStep, resolveExpiresInSec, type PhoneStep as Step } from './login-logic';

export function usePhoneAuth(returnTo: string) {
    const [step, setStep] = useState<Step>('phone');
    const [phone, setPhone] = useState('');
    const [code, setCode] = useState('');
    const [remainingSec, setRemainingSec] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [statusMessage, setStatusMessage] = useState('');
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

    function startCountdown(sec: number) {
        if (timerRef.current) clearInterval(timerRef.current);
        setRemainingSec(sec);
        timerRef.current = setInterval(() => {
            setRemainingSec((prev) => {
                if (prev > 1) return prev - 1;
                if (timerRef.current) clearInterval(timerRef.current);
                return 0;
            });
        }, 1000);
    }

    async function sendCode() {
        setError('');
        setLoading(true);
        try {
            const res = await fetch('/api/analysis/auth/phone/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, consent: true, ageConfirmed: true }),
            });
            const data = await res.json();
            setStep((prev) => nextPhoneStep(prev, res.ok));
            if (!res.ok) {
                setError(typeof data?.error === 'string' ? data.error : '인증번호 발송에 실패했습니다.');
                return;
            }
            setStatusMessage('인증번호를 발송했습니다.');
            startCountdown(resolveExpiresInSec(data?.expiresInSec));
        } catch {
            setError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
        } finally {
            setLoading(false);
        }
    }

    async function verify() {
        setError('');
        setLoading(true);
        try {
            const res = await fetch('/api/analysis/auth/phone/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, code }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(typeof data?.error === 'string' ? data.error : '인증에 실패했습니다.');
                return;
            }
            window.location.href = returnTo;
        } catch {
            setError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
        } finally {
            setLoading(false);
        }
    }

    return { step, phone, setPhone, code, setCode, remainingSec, loading, error, statusMessage, sendCode, verify };
}
