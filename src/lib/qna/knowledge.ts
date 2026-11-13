/**
 * Q&A 봇 기본 지식 문서 (관리자 화면의 qna_knowledge 설정이 있으면 그것을 우선 사용)
 * ※ 내용은 잡모아 담당자 검수 필요
 */
import { getSetting } from '@/lib/db';
import { CRITERIA_2026 } from '@/lib/eligibility/criteria-2026';

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;
const table = Object.entries(CRITERIA_2026.medianIncome)
    .map(([n, v]) => `- ${n === '7' ? '7인 이상' : `${n}인`}: 100% ${won(v)} / 60% ${won(Math.floor(v * 0.6))} / 120% ${won(Math.floor(v * 1.2))}`)
    .join('\n');

export const DEFAULT_QNA_KNOWLEDGE = `[국민취업지원제도 ${CRITERIA_2026.year}년 안내]

■ 제도 개요
취업을 원하는 사람에게 취업지원서비스를 종합 제공하고, 저소득 구직자에게는 생계를 위한 소득을 지원하는 제도. 신청은 고용24(work24.go.kr) 또는 관할 고용센터.

■ Ⅰ유형 (구직촉진수당 지원)
- 요건심사형: 만 15~69세, 가구 중위소득 60% 이하, 가구 재산 4억 원 이하(청년 5억 원 이하), 최근 2년 내 100일 또는 800시간 이상 취업경험
- 선발형(비경제활동): 중위소득 60% 이하, 재산 4억 원 이하이나 취업경험이 부족한 사람 (예산 범위에서 선발)
- 선발형(청년특례): 만 15~34세, 중위소득 120% 이하, 재산 5억 원 이하 (취업경험 무관)
- 지원: 구직촉진수당 월 ${won(CRITERIA_2026.type1MonthlyAllowance)} × 최대 ${CRITERIA_2026.type1AllowanceMonths}개월 + 취업지원서비스, 취업 후 근속 시 취업성공수당

■ Ⅱ유형 (취업활동비용 지원)
- 청년: 만 15~34세, 소득·재산 무관
- 중장년: 만 35~69세, 중위소득 100% 이하
- 특정계층: 기초연금 수급자, 북한이탈주민, 결혼이민자, 위기청소년, 한부모가족, 영세자영업자 등
- 지원: 취업지원서비스, 참여수당·취업활동비용

■ 공통
- 청년 연령 상한은 병역 의무 이행 기간만큼 최대 3년 연장
- 대학생: 재학생은 참여 불가, 마지막 학기 졸업예정자는 참여 가능
- 참여 제한: 생계급여 수급자(조건부 수급자 제외), 현재 참여 중인 사람, 군 복무·수감 중인 사람, 주 30시간 이상 근로 중인 임금근로자(주 30시간 미만은 참여 가능)
- 신청 전 고용24 회원가입·구직등록 필요

■ ${CRITERIA_2026.year}년 기준 중위소득 (월, 가구원 수별)
${table}

■ 잡모아 상담
잡모아 지점에서 국민취업지원제도 신청과 취업 상담을 무료로 도와드립니다. J.AI 화면의 '상담 신청'으로 연락처를 남기면 상담사가 연락드립니다.`;

export async function getQnaKnowledge(): Promise<string> {
    return (await getSetting('qna_knowledge')) || DEFAULT_QNA_KNOWLEDGE;
}
