/**
 * 개인정보처리방침 본문 파서와 기본 개정본.
 * 서버/클라이언트 공용이며 런타임 의존성이 없는 순수 함수만 포함한다.
 * (`src/app/admin/settings/privacy/page.tsx`는 클라이언트 컴포넌트이므로
 * 이 파일은 'next/server' 등 서버 전용 모듈을 import하지 않는다.)
 */

export type PolicyBlock =
    | { type: 'h2' | 'h3' | 'p'; text: string }
    | { type: 'ul'; items: string[] };

/** 관리자 편집 화면과 API에서 공유하는 본문 길이 제한 */
export const PRIVACY_POLICY_MAX_CHARS = 30000;

/**
 * 저장된 값이 없을 때 사용하는 기본 개정본.
 * `src/app/privacy/page.tsx`의 2026-11-12 개정 문구를 그대로 옮겼다.
 * 보호책임자 4개 항목은 관리자 화면에서 입력하도록 [입력 필요]로 남겨둔다.
 */
export const DEFAULT_PRIVACY_POLICY = `잡모아(이하 '회사')는 국민취업지원제도 안내 서비스 J.AI(이하 '서비스')를 운영하며, 이용자의 개인정보를 중요시하고 「개인정보보호법」 등 관련 법령을 준수합니다. 본 방침은 서비스가 수집하는 개인정보의 항목, 목적, 보유 기간 및 처리 방법을 안내합니다.

## 제1조 (수집하는 개인정보의 항목)

### 1. 상담 신청 시 수집 항목

- 이름, 휴대폰 번호, 거주 지역, 희망 직무(선택)
- 진단·상담 내용: 모의진단 응답·결과, 자기소개서·역량 진단 입력·결과, Q&A 질문

### 2. 서비스 이용 시 수집 항목

- Q&A 질문: 챗봇과의 문답 내용 (상담 신청으로 이어지는 경우에만 위 1항에 포함되어 저장)
- 자기소개서·역량 진단 입력: 상담 신청 시에만 저장되며, 상담 신청 없이 결과만 확인한 경우 서버에 저장되지 않습니다.
- 접속 IP: 비정상적인 반복 요청(남용) 방지를 위해 서버 메모리에서 일시적으로만 처리하며, DB에 저장하지 않습니다.

## 제2조 (개인정보의 수집·이용 목적)

- 국민취업지원제도 상담 연락 및 맞춤 안내
- Q&A·모의진단·자기소개서 작성 지원 등 AI 기반 서비스 제공
- 부정 이용 방지 및 서비스 안정적 운영

## 제3조 (보유·이용 기간 및 파기)

상담 신청을 통해 수집한 개인정보는 신청일로부터 1년이 경과하면 지체 없이 파기합니다.

### 파기 절차 및 방법

- 전자적 파일 형태로 저장된 개인정보는 복구·재생이 불가능한 방법으로 영구 삭제합니다.
- 파기는 매 분기 1회 이상 수동 또는 배치 작업으로 수행합니다.

## 제4조 (동의 거부 권리와 불이익)

이용자는 개인정보 수집·이용에 대한 동의를 거부할 권리가 있습니다. 다만 상담 신청에 필요한 최소한의 개인정보이므로, 동의를 거부할 경우 상담 신청 및 맞춤 안내 서비스 이용이 제한될 수 있습니다. Q&A·모의진단 등 상담 신청 외 기능은 동의 여부와 관계없이 계속 이용할 수 있습니다.

## 제5조 (개인정보 처리 위탁 및 국외 이전)

회사는 AI 응답·분석 생성을 위해 아래와 같이 개인정보를 국외로 이전합니다.

- 이전받는 자: Google LLC (미국)
- 이전 항목: Q&A 질문, 모의진단 응답, 자기소개서 입력, 상담사 리포트 생성 시 이름·연락처를 제외한 진단 데이터
- 이전 시점 및 방법: 서비스 이용 시 Google Gemini API를 통해 네트워크로 전송
- 이전 목적: AI 답변·분석 결과 생성
- 보유 기간: Google의 API 데이터 처리 정책에 따름

## 제6조 (정보주체의 권리와 행사 방법)

이용자는 언제든지 자신의 개인정보에 대해 열람, 정정, 삭제, 처리정지를 요구할 수 있습니다. 아래 개인정보 보호책임자에게 전화 또는 이메일로 요청하면 지체 없이 조치합니다.

## 제7조 (개인정보 보호책임자)

- 성명: [입력 필요]
- 직책: [입력 필요]
- 전화: [입력 필요]
- 이메일: [입력 필요]

## 제8조 (개인정보의 안전성 확보 조치)

- 전송 구간 암호화: 이용자와 서버 간 통신은 HTTPS로 암호화합니다.
- 접근 권한 관리: 관리자 화면은 역할 기반 계정으로만 접근할 수 있습니다.
- 관리자 화면에 표시되는 이용자 연락처는 마스킹 처리합니다.

## 제9조 (고지 의무)

본 방침의 내용이 추가, 삭제 및 수정이 있을 경우 변경사항의 시행 7일 전부터 서비스 내 공지사항을 통해 고지합니다.`;

/**
 * 간단한 서식(`## h2`, `### h3`, `- 목록`, 빈 줄 = 문단 구분)만 해석하는 순수 파서.
 * 그 외 모든 줄은 문단 텍스트로 취급하며, HTML은 전혀 해석하지 않고 그대로 보존한다
 * (React는 텍스트를 이스케이프해 렌더링하므로 XSS 위험이 없다. dangerouslySetInnerHTML 사용 금지).
 */
export function parsePolicy(text: string): PolicyBlock[] {
    const lines = text.replace(/\r\n/g, '\n').split('\n');
    const blocks: PolicyBlock[] = [];

    let paragraphLines: string[] = [];
    let listItems: string[] = [];

    const flushParagraph = () => {
        if (paragraphLines.length > 0) {
            blocks.push({ type: 'p', text: paragraphLines.join(' ') });
            paragraphLines = [];
        }
    };

    const flushList = () => {
        if (listItems.length > 0) {
            blocks.push({ type: 'ul', items: listItems });
            listItems = [];
        }
    };

    for (const rawLine of lines) {
        const line = rawLine.trim();

        if (line === '') {
            flushParagraph();
            flushList();
            continue;
        }
        if (line.startsWith('## ')) {
            flushParagraph();
            flushList();
            blocks.push({ type: 'h2', text: line.slice(3).trim() });
            continue;
        }
        if (line.startsWith('### ')) {
            flushParagraph();
            flushList();
            blocks.push({ type: 'h3', text: line.slice(4).trim() });
            continue;
        }
        if (line.startsWith('- ')) {
            flushParagraph();
            listItems.push(line.slice(2).trim());
            continue;
        }

        flushList();
        paragraphLines.push(line);
    }
    flushParagraph();
    flushList();

    return blocks;
}

/** 보호책임자 등 미입력 자리표시자([입력 필요])가 본문에 남아 있는지 확인한다. */
export function hasPlaceholder(text: string): boolean {
    return text.includes('[입력 필요]');
}
