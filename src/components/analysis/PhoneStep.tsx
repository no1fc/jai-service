'use client';

/** 휴대폰 번호 입력 → 인증번호 받기 → 6자리 코드 확인까지의 UI(LoginForm 하위). */
import { canRequestCode, canVerifyCode, formatCountdown, type PhoneStep as Step } from './login-logic';

interface PhoneStepProps {
    step: Step;
    phone: string;
    code: string;
    remainingSec: number;
    loading: boolean;
    agreed: boolean;
    error: string;
    statusMessage: string;
    onPhoneChange: (value: string) => void;
    onCodeChange: (value: string) => void;
    onSendCode: () => void;
    onVerify: () => void;
}

const field = 'w-full px-4 h-11 rounded-[var(--radius-input)] border border-border bg-bg-elevated text-text focus:outline-none focus:border-accent disabled:opacity-50';
const primaryButton = 'w-full h-11 rounded-[var(--radius-default)] font-bold disabled:opacity-50 disabled:cursor-not-allowed';

function PhoneInput({ phone, step, loading, onPhoneChange }: Pick<PhoneStepProps, 'phone' | 'step' | 'loading' | 'onPhoneChange'>) {
    return (
        <label className="block">
            <span className="font-medium text-text">휴대폰 번호</span>
            <input
                value={phone}
                onChange={(e) => onPhoneChange(e.target.value)}
                disabled={step === 'code' || loading}
                placeholder="010-1234-5678"
                inputMode="tel"
                autoComplete="tel"
                className={`${field} mt-1`}
            />
        </label>
    );
}

function CodeInput({ code, remainingSec, loading, onCodeChange, onSendCode, onVerify }: Pick<PhoneStepProps, 'code' | 'remainingSec' | 'loading' | 'onCodeChange' | 'onSendCode' | 'onVerify'>) {
    return (
        <div className="space-y-2">
            <label className="block">
                <span className="font-medium text-text">인증번호</span>
                <input
                    value={code}
                    onChange={(e) => onCodeChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
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
                <button type="button" onClick={onVerify} disabled={!canVerifyCode(code, loading)} className={`${primaryButton} bg-accent text-white hover:bg-accent-hover`}>
                    {loading ? '확인 중…' : '확인'}
                </button>
                <button type="button" onClick={onSendCode} disabled={loading} className={`${primaryButton} border border-border text-text-secondary`}>
                    재전송
                </button>
            </div>
        </div>
    );
}

export default function PhoneStep({ step, phone, code, remainingSec, loading, agreed, error, statusMessage, onPhoneChange, onCodeChange, onSendCode, onVerify }: PhoneStepProps) {
    return (
        <div className="space-y-3">
            <PhoneInput phone={phone} step={step} loading={loading} onPhoneChange={onPhoneChange} />

            {step === 'phone' ? (
                <button type="button" onClick={onSendCode} disabled={!canRequestCode(agreed, phone, loading)} className={`${primaryButton} bg-accent text-white hover:bg-accent-hover`}>
                    {loading ? '발송 중…' : '인증번호 받기'}
                </button>
            ) : (
                <CodeInput code={code} remainingSec={remainingSec} loading={loading} onCodeChange={onCodeChange} onSendCode={onSendCode} onVerify={onVerify} />
            )}

            <p aria-live="polite" className="sr-only">{statusMessage}</p>
            {error && <p role="alert" className="rounded-[var(--radius-default)] border border-danger bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        </div>
    );
}
