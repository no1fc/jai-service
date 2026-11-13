'use client';

/**
 * 참여자 로그인 폼 — 카카오(선택) + 휴대폰 인증. `login/page.tsx`(서버 컴포넌트)가
 * `isKakaoConfigured()`를 직접 호출해 구한 `kakaoEnabled`와 `safeReturnTo`로 정리된 `returnTo`를 prop으로 받는다.
 * 하위 UI는 `ConsentBlock`·`KakaoButton`·`PhoneStep`으로 분리했고, 휴대폰 인증 상태·네트워크 호출은
 * `use-phone-auth.ts` 훅이, 판단 로직은 `login-logic.ts`의 순수 함수가 담당한다.
 */
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ConsentBlock from './ConsentBlock';
import KakaoButton from './KakaoButton';
import PhoneStep from './PhoneStep';
import { usePhoneAuth } from './use-phone-auth';
import { isAgreed, resolveCallbackErrorMessage } from './login-logic';

interface LoginFormProps {
    kakaoEnabled: boolean;
    returnTo: string;
}

function CallbackError() {
    const searchParams = useSearchParams();
    const message = resolveCallbackErrorMessage(searchParams.get('error'));
    if (!message) return null;
    return <p role="alert" className="rounded-[var(--radius-default)] border border-danger bg-danger/10 px-3 py-2 text-sm text-danger">{message}</p>;
}

export default function LoginForm({ kakaoEnabled, returnTo }: LoginFormProps) {
    const [consentCollect, setConsentCollect] = useState(false);
    const [consentAge, setConsentAge] = useState(false);
    const agreed = isAgreed(consentCollect, consentAge);
    const phoneAuth = usePhoneAuth(returnTo);

    return (
        <div className="space-y-5">
            <CallbackError />
            <p className="text-sm text-text-secondary">보관함은 로그인 후 이용할 수 있어요. 리포트 생성은 로그인 없이도 가능합니다.</p>
            <ConsentBlock consentCollect={consentCollect} consentAge={consentAge} onChangeCollect={setConsentCollect} onChangeAge={setConsentAge} />
            <KakaoButton kakaoEnabled={kakaoEnabled} agreed={agreed} returnTo={returnTo} />
            <div className="flex items-center gap-3 text-xs text-text-muted" aria-hidden="true">
                <span className="h-px flex-1 bg-border" />
                <span>또는</span>
                <span className="h-px flex-1 bg-border" />
            </div>
            <PhoneStep
                step={phoneAuth.step} phone={phoneAuth.phone} code={phoneAuth.code} remainingSec={phoneAuth.remainingSec}
                loading={phoneAuth.loading} agreed={agreed} error={phoneAuth.error} statusMessage={phoneAuth.statusMessage}
                onPhoneChange={phoneAuth.setPhone} onCodeChange={phoneAuth.setCode} onSendCode={phoneAuth.sendCode} onVerify={phoneAuth.verify}
            />
        </div>
    );
}
