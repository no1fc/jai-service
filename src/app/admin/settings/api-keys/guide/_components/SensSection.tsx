import React from 'react';
import { MessageSquare } from 'lucide-react';
import { GuideSection } from './GuideSection';
import { ExternalLink } from './ExternalLink';

/** 3. 네이버 클라우드 SENS — 휴대폰 문자 인증. */
export function SensSection() {
    return (
        <GuideSection title="3. 네이버 클라우드 SENS (휴대폰 문자 인증)" icon={<MessageSquare className="text-[var(--color-success)]" size={22} />}>
            <p>
                <ExternalLink href="https://www.ncloud.com">네이버 클라우드 플랫폼</ExternalLink> 포털과 콘솔에서 발급합니다.
            </p>

            <div>
                <p className="font-medium text-[var(--color-text)] mb-2">값 가져오기</p>
                <ul className="list-disc pl-5 space-y-1">
                    <li><strong>SENS Access Key</strong>: 포털 → 마이페이지 → 계정 관리 → 인증키 관리 → API 인증키의 Access Key ID</li>
                    <li><strong>SENS Secret Key</strong>: 같은 화면의 Secret Key</li>
                    <li><strong>SENS Service ID</strong>: 콘솔 → Simple &amp; Easy Notification Service → Project 생성 → 프로젝트의 SMS 서비스 ID</li>
                    <li><strong>SENS 발신번호</strong>: 같은 프로젝트의 SMS → Calling Number에 등록되고 <strong>승인된</strong> 번호(하이픈 없이 숫자만)</li>
                </ul>
            </div>

            <div className="bg-[var(--color-accent-soft)] rounded-[4px] p-4 text-sm space-y-2">
                <p><strong>발신번호 승인</strong>: 발신번호 사전등록제에 따라 서류 심사(통신서비스 이용증명원 등)를 거칩니다. 승인 전에는 문자가 발송되지 않습니다.</p>
                <p><strong>서브 계정 키</strong>: 서브 계정의 키를 쓰려면 그 계정에 SENS 권한이 있어야 합니다. 먼저 메인 계정 키로 확인해 보기를 권합니다.</p>
            </div>

            <div className="border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 rounded-[4px] p-4">
                <p className="font-medium text-[var(--color-text)] mb-1">실제 문자 발송을 켜려면</p>
                <p>
                    위 4개 값을 모두 입력해도 바로 실제 문자가 나가지는 않습니다. <strong>실제 문자 발송을 켜려면 서버 담당자에게
                    &quot;SMS 발송 방식을 sens로 설정&quot;해 달라고 요청하세요. 설정 전에는 문자가 발송되지 않습니다.</strong>
                </p>
            </div>

            <div>
                <p className="font-medium text-[var(--color-text)]">동작 확인</p>
                <p>
                    로그인 화면(/analysis/login)에서 필수 동의 2개에 체크하고, 본인 휴대폰 번호를 넣어 인증번호를 받아
                    봅니다. SMS는 건당 과금되므로 시험 발송은 한두 번이면 충분합니다.
                </p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                    <li>같은 번호로 다시 보내려면 60초를 기다려야 합니다.</li>
                    <li>같은 번호는 하루(한국 시간 자정 기준) 5회까지 보낼 수 있습니다.</li>
                    <li>인증번호는 3분 동안 유효하고, 5회 틀리면 무효가 됩니다.</li>
                </ul>
            </div>
        </GuideSection>
    );
}
