/**
 * AI 시스템 프롬프트 및 템플릿 모음
 * 국민취업지원제도 자가진단 챗봇의 모든 프롬프트를 중앙 관리.
 * DB 연동으로 인해 상수들을 함수로 래핑합니다.
 */

import { getSetting } from '@/lib/db';

// ====================================
// 타입 정의
// ====================================

export interface QuestionChoice {
  id: string;
  label: string;
  value: string;
  isOther?: boolean;
}

export interface ChatStepMessage {
  id?: string;
  message: string;
  choices?: QuestionChoice[];
  phase: string;
  currentStep?: number;
  totalSteps?: number;
}

// ====================================
// 기본 설정값 (Fallback용 상수)
// ====================================

export const DEFAULT_INTRO_MESSAGE = [
  {
    id: 'intro',
    message: '안녕하세요! 저는 국민취업지원제도 자가진단 AI입니다.\n약 3~5분의 간단한 질문으로\n내가 지원받을 수 있는 유형과 수당을 확인할 수 있습니다.\n\n⚠️ 이 진단은 자가진단 목적입니다.\n실제 결과는 고용센터 심사에 따라 달라질 수 있습니다.\n(* 입력하신 답변이 정확하지 않으면 유형 분류가 달라질 수 있습니다.)',
    choices: [
      { id: 'start', label: '✅ 네, 확인했습니다!', value: 'start' },
      { id: 'info', label: 'ℹ️ 국민취업지원제도란?', value: 'info' },
    ],
    phase: 'intro',
    currentStep: 0,
    totalSteps: 12
  }
];

export const DEFAULT_INFO_MESSAGE_CHOICES = [
  { id: 'start', label: '✅ 네, 시작하겠습니다!', value: 'start' },
];

export const DEFAULT_INFO_MESSAGE_TEXT = `[2026년 국민취업지원제도 안내]

국민취업지원제도는 근로 능력과 구직 의사가 있음에도 구조적, 마찰적 요인으로 인해 취업에 어려움을 겪는 국민에게 통합적인 맞춤형 취업지원서비스를 제공하고, 저소득층에게는 생계안정을 위한 구직촉진수당을 결합하여 지원하는 제도입니다.

2026년 개편을 통해 물가 상승을 반영한 지원금 인상, 청년층 재산 요건 완화, 그리고 '고용24' 플랫폼으로의 일원화 등 혜택과 편의성이 대폭 강화되었습니다.
지원 대상은 참여자의 생애 주기 및 가구단위 소득·재산, 취업 경험에 따라 크게 Ⅰ유형과 Ⅱ유형으로 운영됩니다.

■ Ⅰ유형 (구직촉진수당 수급형)
1. 지원 대상 및 자격 요건
   - 요건심사형: 15~69세 구직자 중 가구단위 기준 중위소득 60% 이하, 재산 4억 원 이하이면서 최근 2년 내 100일 또는 800시간 이상의 취업 경험이 있는 자.
   - 선발형(비경제활동): 요건심사형 요건(소득 60% 이하, 재산 4억 원 이하)을 충족하나 취업 경험이 부족한 장기 실업자 및 경력단절 여성.
   - 선발형(청년특례): 15~34세(병역 의무 이행 시 최대 37세) 청년 중 기준 중위소득 120% 이하, 재산 5억 원 이하인 자 (취업 경험 무관하게 지원 가능하여 청년층 진입 장벽 대폭 완화).

2. 핵심 지원 내용
   - 구직촉진수당 인상: 2026년 1월 1일 이후 지급분부터 기존 월 50만 원에서 '월 60만 원'으로 대폭 인상되어 최대 6개월간(총 360만 원) 지급됩니다.
   - 가족수당 연계: 18세 이하 미성년 자녀, 70세 이상 고령자, 중증장애인 등 부양가족에 따라 수당이 가산되어 기본수당 합산 시 월 최대 100만 원까지 수령 가능합니다.
   - 유연한 소득 창출 허용: 수당 수급 중에도 월 약 113만 원 이하의 단기 아르바이트 등 근로 소득 창출이 합법적으로 허용되어, 구직 활동과 부분적 경제 활동의 병행이 가능합니다.

■ Ⅱ유형 (취업활동비용 지원형)
1. 지원 대상 및 자격 요건
   - 특정계층: 기초연금 수급자, 북한이탈주민, 결혼이민자, 영세자영업자 등 (소득·재산 및 취업경험 무관).
   - 청년: 15~34세(최대 37세) 미취업 청년 전원 (소득·재산 및 취업경험 무관하게 보편적 서비스 보장).
   - 중장년: 35~69세 구직자 중 가구단위 기준 중위소득 100% 이하인 자 (재산 및 취업경험 무관).

2. 핵심 지원 내용
   - IAP(개인별 취업활동계획) 수립 참여수당: 초기 상담을 통해 계획 수립 완료 시 기본 15만 원에서 최대 25만 원을 일시 지급합니다.[19]
   - 훈련참여수당 및 취업활동비용: 직업훈련 등 1~3단계 취업 지원 프로그램 과정 수료 시 참여 기간과 출석률에 비례하여 1인당 최대 265만 원까지 단계별 실비를 보전합니다.

■ 사후 보상 및 추가 지원 (공통 연계 기제)
- 취업성공수당: Ⅰ유형 전원 및 Ⅱ유형 저소득층이 주 30시간 이상 정규직 등으로 취업하여 6개월 동일 사업장 근속 시 50만 원, 12개월 연속 근속 시 100만 원(총 150만 원)을 지급하여 조기 퇴사를 방지합니다.
- 청년 빈일자리 특화수당: Ⅱ유형 청년이 1개월 이상 훈련 수료 후 제조업 등 인력난을 겪는 빈일자리 업종에 취업해 6개월 근속할 경우 최대 160만 원(훈련수당+취업성공수당 연계)을 지원합니다.
- 비수도권 취업장려금 연계: 청년이 비수도권 지역(일반/우대/특별 지역 분류) 소재 중소기업에 취업 시, 국가 균형 발전을 위해 청년 개인과 채용 기업에 각각 최대 720만 원의 파격적인 근속 인센티브가 차등 지급됩니다.

■ 필수 신청 절차 및 사후 관리 사항
- 고용24 통합: 2026년부터 모든 행정 절차 및 심사는 차세대 통합 플랫폼 '고용24(work24.go.kr)'로 완전히 일원화되었습니다.
- 구직등록 및 교육: 본 신청 이전에 반드시 고용24 회원가입, 구직등록(이력서 등)을 완료하고, 온라인 사전 안내 동영상을 필수로 수강해야 합니다.
- 사후 관리 체계: 본인 또는 가구원의 중대한 질병 등 발생 시 최대 2년까지 취업지원을 유예할 수 있습니다.
  단, 취업 사실을 고의로 숨기거나 조작된 증빙을 제출하는 등 부정수급 적발 시에는 전액 환수 및 형사 고발 조치되며, 처분일로부터 향후 5년간 본 제도의 재참여가 엄격하게 박탈됩니다.`;

export const DEFAULT_INFO_MESSAGE = [
  {
    id: 'info',
    message: DEFAULT_INFO_MESSAGE_TEXT,
    choices: DEFAULT_INFO_MESSAGE_CHOICES,
    phase: 'info',
    currentStep: 1,
    totalSteps: 12
  }
];

export type PromptCategoryType = 'text' | 'json' | 'json_list';

export interface PromptCategory {
  key: string;
  label: string;
  isFixed: boolean;
  type: PromptCategoryType;
}

export const DEFAULT_PROMPT_CATEGORIES: PromptCategory[] = [
  { key: 'intro_message', label: '모의진단 인트로 메시지(JSON)', isFixed: true, type: 'json_list' },
  { key: 'info_message', label: '모의진단 안내 메시지(JSON)', isFixed: true, type: 'json_list' },
  { key: 'qna_knowledge', label: 'Q&A 봇 지식 문서', isFixed: true, type: 'text' },
];

/** 규칙 엔진 전환으로 더 이상 쓰지 않는 키 (DB에 남아 있어도 화면에서 숨김) */
const RETIRED_PROMPT_KEYS = new Set([
  'system_prompt', 'pdf_ness_info', 'static_questions', 'median_income_table', 'score_table',
]);

// ====================================
// DB 연동 Getter 함수 모음 (async)
// ====================================

export async function getPromptCategories(): Promise<PromptCategory[]> {
  const val = await getSetting('prompt_categories');
  let stored: PromptCategory[] = [];
  try { stored = val ? JSON.parse(val) : []; } catch { stored = []; }
  const merged = [
    ...DEFAULT_PROMPT_CATEGORIES,
    ...stored.filter(c => !DEFAULT_PROMPT_CATEGORIES.some(d => d.key === c.key)),
  ];
  return merged.filter(c => !RETIRED_PROMPT_KEYS.has(c.key));
}

export async function getIntroMessage(): Promise<ChatStepMessage> {
  const val = await getSetting('intro_message');
  try {
    if (val) {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed[0] as ChatStepMessage;
      if (!Array.isArray(parsed)) return parsed as ChatStepMessage;
    }
  } catch {
    // parsing failed
  }
  return DEFAULT_INTRO_MESSAGE[0];
}

export async function getInfoMessage(): Promise<ChatStepMessage> {
  const val = await getSetting('info_message');
  try {
    if (val) {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed[0] as ChatStepMessage;
      if (!Array.isArray(parsed)) return parsed as ChatStepMessage;
    }
  } catch {
    // parsing failed, fallback
  }
  return DEFAULT_INFO_MESSAGE[0];
}
