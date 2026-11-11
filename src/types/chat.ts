/**
 * 챗봇 관련 타입 정의
 * useChat 훅과 ChatContainer 등 컴포넌트에서 공유합니다.
 */

/** 질문 입력 방식 (규칙 엔진 질문 정의와 동일) */
export type QuestionType = 'choice' | 'number' | 'region';

/** 선택지 타입 */
export interface Choice {
    id: string;
    label: string;
    value: string;
    isOther?: boolean;
}

/** 챗 메시지 타입 */
export interface Message {
    id: string;
    role: 'ai' | 'user';
    content: string;
    choices?: Choice[];
    timestamp: Date;
}

/** 진단 결과 타입 */
export interface DiagnosisResult {
    type: '1유형_요건심사형' | '1유형_선발형' | '2유형' | '제한';
    score?: number | null;
    scoreDetails?: string[];
    description: string;
    subType?: string | null;
    tips?: string[];
    restrictReason?: string | null;
}

/** 챗봇 단계 타입 */
export type ChatPhase = 'intro' | 'info' | 'questioning' | 'analyzing' | 'location' | 'result' | 'ended';

/** 챗봇 상태 스냅샷 (이전으로 돌아가기 기능용) */
export interface ChatStateSnapshot {
    messages: Message[];
    currentStep: number;
    phase: ChatPhase;
    userAnswers: Record<string, string>;
    history: Array<{ role: 'user' | 'model'; content: string }>;
    result: DiagnosisResult | null;
    questionId: string | null;
    questionType: QuestionType | null;
    totalSteps: number;
}

/** useChat 훅 반환값 타입 */
export interface UseChatReturn {
    messages: Message[];
    isLoading: boolean;
    currentStep: number;
    totalSteps: number;
    phase: ChatPhase;
    result: DiagnosisResult | null;
    isError: boolean;
    questionType: QuestionType | null;
    canGoBack: boolean;
    userAnswers: Record<string, string>;
    sendChoice: (choice: Choice) => Promise<void>;
    sendText: (text: string) => Promise<void>;
    goBack: () => void;
    retry: () => Promise<void>;
    startChat: () => Promise<void>;
    resetChat: () => void;
}
