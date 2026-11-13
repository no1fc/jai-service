import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { GuideSection } from './GuideSection';

const ITEMS: Array<{ symptom: string; check: string }> = [
    { symptom: '저장 시 오류(403)가 난다', check: '최고 관리자(superadmin) 계정으로 로그인했는지 확인하세요.' },
    { symptom: '카카오 로그인 버튼이 안 보인다', check: '카카오 REST API 키가 저장됐는지 확인하세요(마스킹된 값이 보이면 저장된 것입니다).' },
    { symptom: '카카오 로그인 후 오류가 난다', check: 'REST API 키, Client Secret 활성화, Redirect URI 일치 여부, 카카오 로그인 활성화를 확인하세요.' },
    { symptom: '개발 중 인증번호가 오지 않는다', check: '개발 환경에서는 정상입니다. 서버 담당자에게 서버 로그를 확인해 달라고 요청하세요.' },
    { symptom: '인증번호 요청 시 오류(503)가 난다', check: '운영 서버인데 실제 발송이 꺼져 있거나, SENS 값 4개 중 비어 있는 것이 있습니다. 서버 담당자에게 확인을 요청하세요.' },
    { symptom: '고용24 반영 배지가 안 붙는다', check: '옵션 "채용 시장 트렌드 반영"이 켜져 있는지, 범위가 국내인지, 키가 채용정보 서비스용인지 확인하세요.' },
];

/** 4. 문제 해결 — 증상별 확인할 것. */
export function TroubleshootingSection() {
    return (
        <GuideSection title="4. 문제 해결" icon={<AlertTriangle className="text-[var(--color-danger)]" size={22} />}>
            <div className="space-y-3">
                {ITEMS.map((item) => (
                    <div key={item.symptom} className="border border-[var(--color-border)] rounded-[4px] p-3">
                        <p className="font-medium text-[var(--color-text)]">{item.symptom}</p>
                        <p className="text-sm">{item.check}</p>
                    </div>
                ))}
            </div>
        </GuideSection>
    );
}
