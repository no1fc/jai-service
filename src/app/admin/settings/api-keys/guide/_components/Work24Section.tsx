import React from 'react';
import { Briefcase } from 'lucide-react';
import { GuideSection } from './GuideSection';

/** 1. 고용24 — 채용 데이터 연동. */
export function Work24Section() {
    return (
        <GuideSection title="1. 고용24 (채용 데이터)" icon={<Briefcase className="text-[var(--color-accent)]" size={22} />}>
            <p>고용24 Open API 신청 화면에서 발급받습니다.</p>
            <ol className="list-decimal pl-5 space-y-2">
                <li>
                    고용24에서 Open API 이용을 신청합니다. 서비스마다 키가 따로 발급되므로, 반드시
                    <strong> &quot;채용정보(채용 목록)&quot; 서비스</strong>의 키를 신청합니다.
                </li>
                <li>발급받은 인증키를 관리자 화면의 <strong>&quot;고용24 인증키&quot;</strong> 항목에 입력하고 저장합니다.</li>
            </ol>

            <div>
                <p className="font-medium text-[var(--color-text)]">동작 확인</p>
                <p>
                    분석 화면(/analysis)에서 직무 분석을 실행합니다. 옵션에서 &quot;채용 시장 트렌드 반영&quot;을 켜고 범위는
                    국내로 둡니다. 결과에 <strong>&quot;고용24 반영&quot;</strong> 배지가 보이면 정상입니다.
                </p>
            </div>

            <div>
                <p className="font-medium text-[var(--color-text)]">입력하지 않으면</p>
                <p>리포트는 그대로 만들어집니다. 다만 &quot;고용24 채용 데이터가 반영되지 않았습니다.&quot;라는 안내가 붙습니다.</p>
            </div>
        </GuideSection>
    );
}
