import React from 'react';
import { Info } from 'lucide-react';
import { GuideSection } from './GuideSection';

/** 0. 공통 — 어디에 입력하는지, 저장 후 어떻게 보이는지. */
export function CommonSection() {
    return (
        <GuideSection title="공통: 입력 위치" icon={<Info className="text-[var(--color-accent)]" size={22} />} defaultOpen>
            <ol className="list-decimal pl-5 space-y-2">
                <li><strong>최고 관리자(superadmin)</strong> 계정으로 로그인해야 저장할 수 있습니다. 일반 관리자 계정은 화면을 볼 수는 있지만 저장을 누르면 오류가 납니다.</li>
                <li>왼쪽 메뉴의 <strong>&quot;API 설정&quot;</strong>으로 들어가 맨 아래 <strong>&quot;외부 연동&quot;</strong> 영역으로 이동합니다.</li>
                <li>항목마다 새 값을 입력하고 <strong>저장</strong>을 누릅니다. 저장하면 이전 값을 덮어씁니다.</li>
                <li>
                    개발 서버와 운영 서버는 값이 서로 따로 저장됩니다. <strong>운영 서버에도 똑같이 입력해야 합니다.</strong>
                </li>
            </ol>

            <div className="bg-[var(--color-accent-soft)] rounded-[4px] p-4 text-sm text-[var(--color-text-secondary)]">
                비밀번호처럼 민감한 값(인증키, Secret)은 저장한 뒤 화면에서 가려져(마스킹) 보입니다. 원래 값은 다시 볼 수 없으니,
                발급받은 콘솔에서 다시 확인해야 합니다. 반면 Redirect URI, Service ID, 발신번호처럼 식별용 값은 그대로 보입니다.
            </div>

            <p className="text-sm text-[var(--color-text-muted)]">
                아래 1~3번은 서비스별로 값을 어디서 가져오는지 안내합니다. 각 제목을 눌러 펼쳐 보세요.
            </p>
        </GuideSection>
    );
}
