/**
 * 판정 결과 설명 생성 (AI 프롬프트 + AI 실패 시 기본 문구) 및 UI 결과 형태 변환
 */
import { CRITERIA_2026 } from './criteria-2026';
import type { DiagnosisAnswers, EligibilityResult } from './types';
import type { DiagnosisResult } from '@/types/chat';

export interface Explanation { description: string; tips: string[] }

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

export function buildExplanationPrompt(result: EligibilityResult, answers: DiagnosisAnswers): string {
    const c = CRITERIA_2026;
    return `당신은 국민취업지원제도 상담을 돕는 친절한 안내자입니다.
판정은 이미 규칙으로 확정되었습니다. 판정을 바꾸거나 다른 유형을 제시하지 마세요.

[판정 결과] ${result.label}
[판정 근거]
${result.reasons.map(r => `- ${r}`).join('\n')}
${result.score !== null ? `[선발형 예상 점수] ${result.score}점 (${result.scoreDetails.join(', ')})` : ''}
[사용자 정보] 만 ${answers.age}세, 가구원 ${answers.familySize}인, 거주지 ${answers.region}
[참고] Ⅰ유형 구직촉진수당: 월 ${won(c.type1MonthlyAllowance)} × 최대 ${c.type1AllowanceMonths}개월 (${c.year}년 기준)

[작성 규칙]
- description: 결과의 의미와 받을 수 있는 지원을 2~3문장, 쉬운 말로. 마지막 문장은 ${answers.region} 인근 잡모아 지점 상담을 권유.
- tips: 신청 준비 팁 2~3개 (고용24 구직등록, 서류 준비 등). 참여 제한·대상 아님이면 관할 고용센터 확인을 권유.
- 모의진단이며 실제 결과는 고용센터 심사에 따라 달라질 수 있음을 description에 한 번 언급.

[출력: JSON만]
{"description": "...", "tips": ["...", "..."]}`;
}

export function fallbackExplanation(result: EligibilityResult): Explanation {
    const c = CRITERIA_2026;
    const isType1 = result.type === 'requirement' || result.type.startsWith('selection');
    const description = isType1
        ? `${result.label}에 해당할 가능성이 높습니다. 구직촉진수당 월 ${won(c.type1MonthlyAllowance)}을 최대 ${c.type1AllowanceMonths}개월 받을 수 있습니다. 실제 결과는 고용센터 심사에 따라 달라질 수 있습니다.`
        : result.type.startsWith('type2')
            ? `${result.label}에 해당할 가능성이 높습니다. 취업지원서비스와 취업활동비용을 지원받을 수 있습니다. 실제 결과는 고용센터 심사에 따라 달라질 수 있습니다.`
            : `${result.reasons[0]} 정확한 확인은 관할 고용센터나 가까운 잡모아 지점에 문의해 주세요.`;
    return {
        description,
        tips: ['고용24(work24.go.kr)에서 회원가입과 구직등록을 먼저 해 두세요.', '가까운 잡모아 지점에서 무료로 신청을 도와드립니다.'],
    };
}

const SUBTYPE: Partial<Record<EligibilityResult['type'], string>> = {
    type2_special: '특정계층', type2_youth: '청년', type2_middle: '중장년',
    selection_youth: '청년특례', selection_inactive: '비경제활동',
};

export function toDiagnosisResult(result: EligibilityResult, explanation: Explanation): DiagnosisResult {
    const type: DiagnosisResult['type'] =
        result.type === 'requirement' ? '1유형_요건심사형'
            : result.type.startsWith('selection') ? '1유형_선발형'
                : result.type.startsWith('type2') ? '2유형'
                    : '제한';
    return {
        type,
        score: result.score,
        scoreDetails: result.scoreDetails,
        description: explanation.description,
        subType: SUBTYPE[result.type] ?? null,
        tips: explanation.tips,
        restrictReason: type === '제한' ? result.reasons.join(' ') : null,
    };
}
