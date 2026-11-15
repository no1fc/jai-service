import { Suspense } from 'react';
import { safeReturnTo } from '@/lib/analysis/auth/kakao';
import SignupForm from '@/components/analysis/SignupForm';

export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<{ returnTo?: string }> };

/** 참여자 회원가입 화면(서버 컴포넌트) — `safeReturnTo`로 정리한 `returnTo`를 클라이언트 폼에 넘긴다. */
export default async function SignupPage({ searchParams }: Props) {
    const returnTo = safeReturnTo((await searchParams).returnTo ?? null);

    return (
        <div className="max-w-md mx-auto space-y-4">
            <h1 className="text-xl font-bold text-text">회원가입</h1>
            <Suspense fallback={null}>
                <SignupForm returnTo={returnTo} />
            </Suspense>
        </div>
    );
}
