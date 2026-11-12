'use client';

/**
 * 참여자 로그인 폼 — 카카오(선택) + 휴대폰 인증. `login/page.tsx`(서버 컴포넌트)가
 * `isKakaoConfigured()`를 직접 호출해 구한 `kakaoEnabled`와 `safeReturnTo`로 정리된 `returnTo`를 prop으로 받는다.
 */
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface LoginFormProps {
    kakaoEnabled: boolean;
    returnTo: string;
}

type Step = 'phone' | 'code';

const PHONE_RE = /^01[016789]-?\d{3,4}-?\d{4}$/;
const CALLBACK_ERROR_MESSAGE: Record<string, string> = {
    cancelled: '카카오 로그인을 취소했습니다.',
    kakao: '카카오 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.',
    state: '로그인 요청이 만료되었습니다. 처음부터 다시 시도해 주세요.',
};

const field = 'w-full px-4 h-11 rounded-[var(--radius-input)] border border-border bg-bg-elevated text-text focus:outline-none focus:border-accent disabled:opacity-50';
const primaryButton = 'w-full h-11 rounded-[var(--radius-default)] font-bold disabled:opacity-50 disabled:cursor-not-allowed';
const checkboxRow = 'flex items-start gap-2 min-h-11';

function formatCountdown(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

function CallbackError() {
    const searchParams = useSearchParams();
    const code = searchParams.get('error');
    if (!code) return null;
    const message = CALLBACK_ERROR_MESSAGE[code] ?? CALLBACK_ERROR_MESSAGE.kakao;
    return <p role="alert" className="rounded-[var(--radius-default)] border border-danger bg-danger/10 px-3 py-2 text-sm text-danger">{message}</p>;
}

export default function LoginForm({ kakaoEnabled, returnTo }: LoginFormProps) {
    const [consentCollect, setConsentCollect] = useState(false);
    const [consentAge, setConsentAge] = useState(false);
    const agreed = consentCollect && consentAge;

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
                if (prev <= 1) {
                    if (timerRef.current) clearInterval(timerRef.current);
                    return 0;
                }
                return prev - 1;
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
            if (!res.ok) {
                setError(typeof data?.error === 'string' ? data.error : '인증번호 발송에 실패했습니다.');
                return;
            }
            setStep('code');
            setStatusMessage('인증번호를 발송했습니다.');
            startCountdown(Number(data?.expiresInSec) || 180);
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

    const kakaoHref = `/api/analysis/auth/kakao?consent=1&returnTo=${encodeURIComponent(returnTo)}`;

    return (
        <div className="space-y-5">
            <CallbackError />

            <p className="text-sm text-text-secondary">보관함은 로그인 후 이용할 수 있어요. 리포트 생성은 로그인 없이도 가능합니다.</p>

            <div className="rounded-[var(--radius-card)] border border-border bg-bg-elevated p-4 space-y-3">
                <div className="text-sm text-text-secondary space-y-1">
                    <p className="font-medium text-text">개인정보 수집·이용 안내</p>
                    <p>수집 항목: 카카오 회원번호·이메일(선택) 또는 휴대폰 번호</p>
                    <p>목적: 로그인·보관함 제공</p>
                    <p>보관 기간: 마지막 로그인 후 1년</p>
                    <p><Link href="/privacy" className="text-accent underline">개인정보처리방침 전체 보기</Link></p>
                </div>
                <label className={checkboxRow}>
                    <input type="checkbox" checked={consentCollect} onChange={(e) => setConsentCollect(e.target.checked)} className="mt-0.5 w-5 h-5" />
                    <span className="text-text">[필수] 개인정보 수집·이용 동의</span>
                </label>
                <label className={checkboxRow}>
                    <input type="checkbox" checked={consentAge} onChange={(e) => setConsentAge(e.target.checked)} className="mt-0.5 w-5 h-5" />
                    <span className="text-text">[필수] 만 14세 이상입니다</span>
                </label>
            </div>

            {kakaoEnabled ? (
                agreed ? (
                    <a
                        href={kakaoHref}
                        className={`${primaryButton} flex items-center justify-center text-[#191919]`}
                        // ponytail: 카카오 브랜드 가이드 예외 — 디자인 토큰 체계의 유일한 인라인 색상(#FEE500) 허용.
                        style={{ backgroundColor: '#FEE500' }}
                    >
                        카카오로 로그인
                    </a>
                ) : (
                    <button type="button" disabled className={`${primaryButton} bg-[#FEE500] text-[#191919]`}>카카오로 로그인</button>
                )
            ) : (
                <p className="text-sm text-text-muted">카카오 로그인은 현재 준비 중입니다. 휴대폰 인증을 이용해 주세요.</p>
            )}

            <div className="flex items-center gap-3 text-xs text-text-muted" aria-hidden="true">
                <span className="h-px flex-1 bg-border" />
                <span>또는</span>
                <span className="h-px flex-1 bg-border" />
            </div>

            <div className="space-y-3">
                <label className="block">
                    <span className="font-medium text-text">휴대폰 번호</span>
                    <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        disabled={step === 'code' || loading}
                        placeholder="010-1234-5678"
                        inputMode="tel"
                        autoComplete="tel"
                        className={`${field} mt-1`}
                    />
                </label>

                {step === 'phone' ? (
                    <button
                        type="button"
                        onClick={sendCode}
                        disabled={!agreed || loading || !PHONE_RE.test(phone)}
                        className={`${primaryButton} bg-accent text-white hover:bg-accent-hover`}
                    >
                        {loading ? '발송 중…' : '인증번호 받기'}
                    </button>
                ) : (
                    <div className="space-y-2">
                        <label className="block">
                            <span className="font-medium text-text">인증번호</span>
                            <input
                                value={code}
                                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                maxLength={6}
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                placeholder="6자리 숫자"
                                className={`${field} mt-1`}
                            />
                        </label>
                        <p className="text-sm text-text-muted">
                            {remainingSec > 0 ? `남은 시간 ${formatCountdown(remainingSec)}` : '인증번호가 만료되었습니다. 다시 받아 주세요.'}
                        </p>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={verify}
                                disabled={loading || code.length !== 6}
                                className={`${primaryButton} bg-accent text-white hover:bg-accent-hover`}
                            >
                                {loading ? '확인 중…' : '확인'}
                            </button>
                            <button
                                type="button"
                                onClick={sendCode}
                                disabled={loading}
                                className={`${primaryButton} border border-border text-text-secondary`}
                            >
                                재전송
                            </button>
                        </div>
                    </div>
                )}

                <p aria-live="polite" className="sr-only">{statusMessage}</p>
                {error && <p role="alert" className="rounded-[var(--radius-default)] border border-danger bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
            </div>
        </div>
    );
}
