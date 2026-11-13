import React from 'react';
import { KeyRound } from 'lucide-react';
import { GuideSection } from './GuideSection';
import { ExternalLink } from './ExternalLink';
import { CopyRedirectButton } from './CopyRedirectButton';

/** 2. 카카오 로그인 — REST API 키, Client Secret, Redirect URI. */
export function KakaoSection({ redirectUri }: { redirectUri: string }) {
    return (
        <GuideSection title="2. 카카오 로그인" icon={<KeyRound className="text-[var(--color-warning)]" size={22} />}>
            <p>
                <ExternalLink href="https://developers.kakao.com">Kakao Developers</ExternalLink> → 내 애플리케이션에서 발급합니다.
            </p>

            <div className="bg-[var(--color-accent-soft)] rounded-[4px] p-4 text-sm">
                기존에 등록된 <strong>&quot;카카오 지도 API 키&quot;</strong>와는 다른 키입니다. 로그인에는 <strong>REST API 키</strong>를
                씁니다. 같은 앱의 키를 써도 되고, 앱을 새로 만들어도 됩니다.
            </div>

            <div>
                <p className="font-medium text-[var(--color-text)] mb-2">콘솔에서 값 가져오기</p>
                <ul className="list-disc pl-5 space-y-1">
                    <li><strong>카카오 REST API 키</strong>: 앱 설정 → 앱 키 → REST API 키</li>
                    <li><strong>카카오 Client Secret</strong>: 카카오 로그인 → 보안 → Client Secret 코드 발급 후, 활성화 상태를 &quot;사용함&quot;으로 바꿉니다. (필수 — 꺼져 있으면 로그인이 실패합니다)</li>
                    <li><strong>카카오 Redirect URI</strong>: 아래에서 복사한 값을 그대로 붙여넣습니다.</li>
                </ul>
            </div>

            <div className="border border-[var(--color-border)] rounded-[4px] p-4 space-y-3">
                <p className="font-medium text-[var(--color-text)]">이 사이트의 Redirect URI</p>
                <code className="block break-all bg-[var(--color-bg)] rounded-[4px] px-3 py-2 text-sm text-[var(--color-text)]">
                    {redirectUri}
                </code>
                <CopyRedirectButton value={redirectUri} />
                <p className="text-xs text-[var(--color-text-muted)]">
                    운영 서버에서 이 화면을 열면 운영 주소가 표시됩니다. 지금 보이는 주소를 카카오 콘솔의 Redirect URI에
                    한 글자도 다르지 않게 등록하세요.
                </p>
            </div>

            <div>
                <p className="font-medium text-[var(--color-text)] mb-2">콘솔 설정</p>
                <ol className="list-decimal pl-5 space-y-2">
                    <li><strong>카카오 로그인 활성화</strong>를 켭니다(ON).</li>
                    <li>위에서 복사한 <strong>Redirect URI</strong>를 등록합니다.</li>
                    <li><strong>동의항목</strong>에서 &quot;카카오계정(이메일)&quot;을 선택 동의로 켭니다. 그 외 항목(닉네임, 전화번호 등)은 켜지 않습니다.</li>
                    <li><strong>플랫폼 → Web → 사이트 도메인</strong>에 이 사이트의 주소를 등록합니다.</li>
                </ol>
            </div>

            <div>
                <p className="font-medium text-[var(--color-text)]">동작 확인</p>
                <p>
                    로그인 화면(/analysis/login)에 &quot;카카오로 로그인&quot; 버튼이 보이면 키가 인식된 것입니다. 필수 동의
                    2개에 체크하고 로그인해 보관함 화면으로 돌아오면 정상입니다.
                </p>
                <p className="mt-2">
                    로그인이 실패하면 화면에 오류가 표시됩니다. REST API 키, Client Secret 활성화 여부, Redirect URI가
                    위 주소와 정확히 같은지, 카카오 로그인 활성화 여부를 다시 확인하세요.
                </p>
            </div>
        </GuideSection>
    );
}
