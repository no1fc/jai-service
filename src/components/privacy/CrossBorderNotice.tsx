import Link from 'next/link';

/**
 * 국외 이전 고지 — 개인정보 보호법 제28조의8.
 * `/ask` 입력창 주변, `/career` 경험 입력란 아래에서 공통으로 쓰는 한 줄 안내.
 */
export default function CrossBorderNotice() {
    return (
        <p role="note" className="text-xs text-text-muted">
            입력 내용은 AI 답변 생성을 위해 Google(미국)로 전송됩니다. 이름·연락처 등 개인을 알아볼 수 있는 정보는 입력하지 마세요.{' '}
            <Link href="/privacy" className="underline">자세히</Link>
        </p>
    );
}
