/**
 * 리포트 표시용 라벨 변환 — 순수 함수만 모아둔 의존성 없는 모듈.
 * 런타임 import는 `./schema`의 타입(type-only, 컴파일 시 제거)뿐이라 서버·클라이언트
 * 양쪽에서 안전하게 import할 수 있다(클라이언트 import 허용 목록에 추가해도 되는 순수 모듈).
 */
import type { PublicReport } from './schema';

/**
 * meta.dataUsed에 따른 데이터 반영 배지 라벨(고용24/웹 검색 둘 다·하나만·AI 지식 기반).
 * `ReportView.tsx`(화면)와 `ReportPdf.tsx`(PDF)가 함께 사용한다.
 */
export function dataBadgeLabels(report: PublicReport): string[] {
    const labels = report.meta.dataUsed.map(d => (d === 'work24' ? '고용24 반영' : '웹 검색 반영'));
    return labels.length > 0 ? labels : ['AI 지식 기반'];
}
