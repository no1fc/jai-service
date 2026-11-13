import { Suspense } from 'react';
import { isKakaoConfigured, safeReturnTo } from '@/lib/analysis/auth/kakao';
import LoginForm from '@/components/analysis/LoginForm';

export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<{ returnTo?: string }> };

/**
 * 참여자 로그인 화면(서버 컴포넌트) — API 왕복 없이 `isKakaoConfigured()`를 직접 호출해
 * 카카오 버튼 노출 여부를 정하고, `safeReturnTo`로 정리한 `returnTo`를 클라이언트 폼에 넘긴다.
 */
export default async function LoginPage({ searchParams }: Props) {
    const kakaoEnabled = await isKakaoConfigured();
    const returnTo = safeReturnTo((await searchParams).returnTo ?? null);

    return (
        <div className="max-w-md mx-auto space-y-4">
            <h1 className="text-xl font-bold text-text">로그인</h1>
            <Suspense fallback={null}>
                <LoginForm kakaoEnabled={kakaoEnabled} returnTo={returnTo} />
            </Suspense>
        </div>
    );
}
