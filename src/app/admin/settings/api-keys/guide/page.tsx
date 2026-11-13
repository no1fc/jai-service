import React from 'react';
import Link from 'next/link';
import { headers } from 'next/headers';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { buildKakaoRedirectUri } from './redirect-uri';
import { CommonSection } from './_components/CommonSection';
import { Work24Section } from './_components/Work24Section';
import { KakaoSection } from './_components/KakaoSection';
import { SensSection } from './_components/SensSection';
import { TroubleshootingSection } from './_components/TroubleshootingSection';
import { DeveloperNote } from './_components/DeveloperNote';

export const metadata = { title: '외부 연동 키 등록 가이드' };

/** 비개발자 관리자를 위한 외부 연동(고용24·카카오·SENS) 키 등록 안내 화면. */
export default async function ApiKeysGuidePage() {
    const h = await headers();
    const redirectUri = buildKakaoRedirectUri(h.get('x-forwarded-proto'), h.get('host'));

    return (
        <div className="max-w-4xl space-y-4 pb-12">
            <Link
                href="/admin/settings/api-keys"
                className="inline-flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
            >
                <ArrowLeft size={16} /> API 설정으로 돌아가기
            </Link>

            <div>
                <h1 className="text-3xl font-bold text-[var(--color-text)] flex items-center gap-2">
                    <BookOpen className="text-[var(--color-accent)]" size={28} />
                    외부 연동 키 등록 가이드
                </h1>
                <p className="text-[var(--color-text-muted)] mt-2 max-w-2xl leading-relaxed">
                    고용24·카카오 로그인·네이버 클라우드 SENS 세 가지 외부 서비스의 키를 등록하는 방법을 안내합니다.
                    각 제목을 눌러 펼쳐 보세요.
                </p>
            </div>

            <div className="mt-6">
                <CommonSection />
                <Work24Section />
                <KakaoSection redirectUri={redirectUri} />
                <SensSection />
                <TroubleshootingSection />
            </div>

            <DeveloperNote />
        </div>
    );
}
