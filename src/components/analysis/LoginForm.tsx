'use client';

/**
 * 참여자 로그인 폼 — 카카오(선택) + 이메일. `login/page.tsx`(서버 컴포넌트)가
 * `isKakaoConfigured()`를 직접 호출해 구한 `kakaoEnabled`와 `safeReturnTo`로 정리된 `returnTo`를 prop으로 받는다.
 * 하위 UI는 `ConsentBlock`·`KakaoButton`·`EmailLoginForm`으로 분리했고, 판단 로직은 `login-logic.ts`의 순수 함수가 담당한다.
 * 동의 체크는 카카오 첫 로그인·가입에만 요구하므로 `ConsentBlock`은 카카오 버튼 위에만 둔다(이메일 로그인은
 * 이미 가입 시 동의했으므로 다시 요구하지 않는다).
 */
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ConsentBlock from './ConsentBlock';
import KakaoButton from './KakaoButton';
import EmailLoginForm from './EmailLoginForm';
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
            <EmailLoginForm returnTo={returnTo} />
        </div>
    );
}
