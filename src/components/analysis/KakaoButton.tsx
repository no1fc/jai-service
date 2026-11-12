'use client';

/** 카카오 로그인 버튼(LoginForm 하위) — 미설정이면 준비 중 안내, 동의 전엔 비활성, 동의 후엔 실제 링크. */
interface KakaoButtonProps {
    kakaoEnabled: boolean;
    agreed: boolean;
    returnTo: string;
}

const primaryButton = 'w-full h-11 rounded-[var(--radius-default)] font-bold disabled:opacity-50 disabled:cursor-not-allowed';

// ponytail: 카카오 브랜드 가이드 예외 — 디자인 토큰 체계의 유일한 인라인 색상(#FEE500/#191919) 허용.
// 활성(링크)·비활성(버튼) 양쪽에서 이 상수 하나만 쓴다.
const KAKAO_BRAND_STYLE = { backgroundColor: '#FEE500', color: '#191919' } as const;

export default function KakaoButton({ kakaoEnabled, agreed, returnTo }: KakaoButtonProps) {
    if (!kakaoEnabled) {
        return <p className="text-sm text-text-muted">카카오 로그인은 현재 준비 중입니다. 휴대폰 인증을 이용해 주세요.</p>;
    }

    if (!agreed) {
        return <button type="button" disabled style={KAKAO_BRAND_STYLE} className={primaryButton}>카카오로 로그인</button>;
    }

    const kakaoHref = `/api/analysis/auth/kakao?consent=1&returnTo=${encodeURIComponent(returnTo)}`;
    return (
        <a href={kakaoHref} style={KAKAO_BRAND_STYLE} className={`${primaryButton} flex items-center justify-center`}>
            카카오로 로그인
        </a>
    );
}
