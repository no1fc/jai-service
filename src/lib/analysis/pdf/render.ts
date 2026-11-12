/**
 * 분석 리포트 PDF 렌더링(react-pdf) — 서버 전용. 폰트 등록은 모듈 로드 시 1회만 수행한다.
 */
import path from 'path';
import React from 'react';
import { Font, renderToBuffer } from '@react-pdf/renderer';
import { ANALYSIS_TYPE_LABEL, type PublicReport } from '../schema';
import ReportPdf from './ReportPdf';

Font.register({
    family: 'NotoSansKR',
    fonts: [
        { src: path.join(process.cwd(), 'public/fonts/NotoSansKR-Regular.ttf') },
        { src: path.join(process.cwd(), 'public/fonts/NotoSansKR-Bold.ttf'), fontWeight: 700 },
    ],
});
// 한글은 음절 단위로 쪼개 하이픈을 넣지 않고 단어(공백) 단위로만 줄바꿈한다.
Font.registerHyphenationCallback(word => [word]);

/** 리포트를 PDF Buffer로 렌더링한다(`%PDF-`로 시작). */
export function renderReportPdf(report: PublicReport): Promise<Buffer> {
    // ReportPdf는 루트에서 <Document>를 반환하지만, 타입 레벨에서는 커스텀 컴포넌트 엘리먼트라
    // renderToBuffer가 요구하는 ReactElement<DocumentProps>와 구조적으로 일치하지 않아 캐스팅이 필요하다.
    const document = React.createElement(ReportPdf, { report }) as unknown as Parameters<typeof renderToBuffer>[0];
    return renderToBuffer(document);
}

/** 파일명에 안전한 문자(한글·영문·숫자)만 남긴다. */
function sanitizeForFileName(value: string): string {
    return value.replace(/[^\p{Script=Hangul}\p{Script=Latin}0-9]/gu, '');
}

/**
 * PDF 다운로드 파일명 — 예: `J.AI_직무분석_핀테크PM_2026-11-12.pdf`.
 * 키워드가 전부 안전하지 않은 문자로만 이루어져도(이모지 등) 빈 문자열이 되지 않도록 대체 문자열을 쓴다.
 */
export function pdfFileName(report: PublicReport): string {
    const typeLabel = sanitizeForFileName(ANALYSIS_TYPE_LABEL[report.type]);
    const keyword = sanitizeForFileName(report.keyword) || '키워드';
    const createdDate = report.createdAt.slice(0, 10);
    return `J.AI_${typeLabel}_${keyword}_${createdDate}.pdf`;
}
