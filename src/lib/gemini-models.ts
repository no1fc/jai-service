/**
 * Gemini 모델 카탈로그
 * 클라이언트/서버 공용 (런타임 의존성 없음, @google/genai import 금지).
 * 2026-11 공식 가격표 기준, 변동 가능.
 */

export type GeminiModelStatus = 'stable' | 'preview' | 'deprecated';

export interface GeminiModelInfo {
    id: string;
    label: string;
    status: GeminiModelStatus;
    /** 입력 $/1M 토큰 (2026-11 기준) */
    inputRate: number;
    /** 출력 $/1M 토큰 (thinking 토큰 포함, 2026-11 기준) */
    outputRate: number;
    note?: string;
}

export const GEMINI_MODELS: readonly GeminiModelInfo[] = [
    {
        id: 'gemini-4-carbon',
        label: 'Gemini 4 Carbon',
        status: 'stable',
        inputRate: 2.00,
        outputRate: 10.00,
        note: '최고 품질 추론, 무료 티어 없음. 2026-12-01부터 입력 $4.00 / 출력 $20.00로 인상 예정.',
    },
    {
        id: 'gemini-4-argon',
        label: 'Gemini 4 Argon',
        status: 'stable',
        inputRate: 2.00,
        outputRate: 10.00,
        note: 'Gemini 4 빠른 버전. 2026-12-01부터 입력 $4.00 / 출력 $20.00로 인상 예정.',
    },
    {
        id: 'gemini-3.8-flash',
        label: 'Gemini 3.8 Flash',
        status: 'stable',
        inputRate: 0.75,
        outputRate: 3.75,
        note: '가장 똑똑한 Flash. thinking minimal 미지원. 2027-01-01부터 입력 $1.50 / 출력 $7.50로 인상 예정.',
    },
    {
        id: 'gemini-3.6-flash',
        label: 'Gemini 3.6 Flash',
        status: 'stable',
        inputRate: 0.75,
        outputRate: 3.75,
        note: '이전 세대 Flash. 2027-01-01부터 입력 $1.50 / 출력 $7.50로 인상 예정.',
    },
    {
        id: 'gemini-3.5-flash-lite',
        label: 'Gemini 3.5 Flash-Lite',
        status: 'stable',
        inputRate: 0.30,
        outputRate: 2.50,
        note: '가장 빠르고 저렴한 신형.',
    },
    {
        id: 'gemini-3.1-flash-lite',
        label: 'Gemini 3.1 Flash-Lite',
        status: 'deprecated',
        inputRate: 0.25,
        outputRate: 1.50,
        note: '2027-05-07 종료. 후속: gemini-3.5-flash-lite.',
    },
    {
        id: 'gemini-3.1-pro-preview',
        label: 'Gemini 3.1 Pro Preview',
        status: 'preview',
        inputRate: 2.00,
        outputRate: 12.00,
    },
    {
        id: 'gemini-2.5-flash',
        label: 'Gemini 2.5 Flash',
        status: 'deprecated',
        inputRate: 0.30,
        outputRate: 2.50,
        note: '2026-12-01 종료. 이후 gemini-3.5-flash-lite로 자동 라우팅.',
    },
    {
        id: 'gemini-2.5-pro',
        label: 'Gemini 2.5 Pro',
        status: 'deprecated',
        inputRate: 1.25,
        outputRate: 10.00,
        note: '2026-12-01 종료.',
    },
] as const;

/** 일반 응답(Q&A 봇, 모의진단 설명)용 기본 모델 */
export const DEFAULT_CHAT_MODEL = 'gemini-3.5-flash-lite';
/** 분석(자기소개서·역량 진단, 상담사 리포트)용 기본 모델 */
export const DEFAULT_ANALYSIS_MODEL = 'gemini-3.8-flash';

/**
 * id로 카탈로그에서 모델 정보를 찾는다.
 * @param id - 조회할 모델 id
 * @returns 일치하는 모델 정보, 없으면 undefined
 */
export function findGeminiModel(id: string | null | undefined): GeminiModelInfo | undefined {
    if (!id) return undefined;
    return GEMINI_MODELS.find((m) => m.id === id);
}

/**
 * 저장된 모델 값이 유효(stable/preview)한지 확인하고, 아니면 fallback으로 대체한다.
 * 저장값이 없거나, 카탈로그에 없거나, deprecated(종료/종료 예정)면 fallback을 반환한다.
 * @param stored - DB에 저장된 모델 id
 * @param fallback - 대체할 기본 모델 id
 * @returns 실제 사용할 모델 id와 대체 여부
 */
export function resolveGeminiModel(
    stored: string | null | undefined,
    fallback: string
): { id: string; replaced: boolean } {
    const found = findGeminiModel(stored);
    if (found && found.status !== 'deprecated') {
        return { id: found.id, replaced: false };
    }
    return { id: fallback, replaced: true };
}
