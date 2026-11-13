/**
 * POST /api/chat - 챗봇 대화 API Route
 * 사용자 입력을 받아 Gemini AI로 응답을 생성합니다.
 * phase별로 질문 생성(questioning) 또는 유형 판별(analyzing)을 수행합니다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateResponse, safeParseJSON } from '@/lib/gemini';
import { getInfoMessage, getIntroMessage } from '@/lib/prompts';
import { DIAGNOSIS_QUESTIONS, parseDiagnosisAnswers } from '@/lib/eligibility/answers';
import { judgeEligibility } from '@/lib/eligibility/judge';
import {
    buildExplanationPrompt, fallbackExplanation, toDiagnosisResult, type Explanation,
} from '@/lib/eligibility/explain';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic'; // API 자동 캐싱 방지 처리 및 DB 상시 조회

// 챗봇 단계 타입 정의
type ChatPhase = 'intro' | 'info' | 'questioning' | 'analyzing' | 'location' | 'result' | 'ended';

// 선택지 타입 정의
interface Choice {
    id: string;
    label: string;
    value: string;
    isOther?: boolean;
}

// API 응답 바디 타입 정의
interface ChatResponse {
    message: string;
    choices?: Choice[];
    phase: ChatPhase;
    currentStep?: number;
    totalSteps?: number;
    questionId?: string;
    type?: 'choice' | 'number' | 'region'; // 질문의 특수 타입
    result?: {
        type: string;
        score?: number | null;
        scoreDetails?: string[];
        description: string;
        subType?: string | null;
        tips?: string[];
        restrictReason?: string | null;
    };
    error?: string;
}


/**
 * POST 요청 핸들러
 * phase에 따라 다음 질문 생성 또는 최종 유형 판별 수행
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        // 요청 바디 파싱 및 검증
        const { chatRequestSchema, formatZodError } = await import('@/lib/validations');
        const rawBody = await request.json();
        const parsed = chatRequestSchema.safeParse(rawBody);
        if (!parsed.success) {
            return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
        }
        const { phase, userAnswers, currentStep } = parsed.data;

        // ==================== INTRO 단계 ====================
        // 첫 번째 인사 메시지 반환 (Gemini 호출 없음)
        if (phase === 'intro') {
            return NextResponse.json(await getIntroMessage(), { status: 200 });
        }

        // ==================== INFO 단계 ====================
        // 국민취업지원제도 정보 메시지 반환 (Gemini 호출 없음)
        if (phase === 'info') {
            return NextResponse.json(await getInfoMessage(), { status: 200 });
        }

        // ==================== LOCATION 단계 (Deprecated) ====================
        // 더 이상 사용되지 않음 (이제 질문 단계에서 처리됨)
        if (phase === 'location') {
            return NextResponse.json({ error: 'Deprecated phase' }, { status: 400 });
        }

        // ==================== ANALYZING 단계 ====================
        // 수집된 답변으로 규칙 엔진 판정 수행
        if (phase === 'analyzing') {
            // Gemini를 호출하는 유일한 단계이므로 이 단계에서만 IP 기반 요청 제한을 건다.
            const limit = checkRateLimit(`chat:${getClientIp(request)}`, { maxRequests: 10, windowMs: 10 * 60 * 1000 });
            if (!limit.allowed) {
                return NextResponse.json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' }, { status: 429 });
            }

            const parsedAnswers = parseDiagnosisAnswers(userAnswers);
            if (!parsedAnswers.ok) {
                logger.warn('진단 응답 검증 실패:', parsedAnswers.error);
                return NextResponse.json({ error: '응답에 누락되거나 잘못된 값이 있습니다. 처음부터 다시 진행해 주세요.' }, { status: 400 });
            }
            const answers = parsedAnswers.answers;
            const eligibility = judgeEligibility(answers);

            // AI는 설명만 생성. 실패해도 규칙 판정 + 기본 문구로 결과를 보여준다.
            let explanation: Explanation = fallbackExplanation(eligibility);
            try {
                const { logApiUsage } = await import('@/lib/db');
                const ai = await generateResponse(buildExplanationPrompt(eligibility, answers), '위 판정 결과를 설명해 주세요.');
                const parsedExplanation = safeParseJSON<Explanation>(ai.text);
                if (parsedExplanation?.description && Array.isArray(parsedExplanation.tips)) explanation = parsedExplanation;
                await logApiUsage(
                    ai.modelName,
                    ai.usageMetadata?.promptTokenCount || 0,
                    ai.usageMetadata?.candidatesTokenCount || 0,
                    ai.usageMetadata?.totalTokenCount || 0,
                    eligibility.type,
                );
            } catch (error) {
                logger.warn('진단 설명 생성 실패, 기본 문구 사용:', error);
            }

            return NextResponse.json({
                message: '진단이 완료되었습니다! 아래에서 결과를 확인하세요.',
                phase: 'result',
                result: toDiagnosisResult(eligibility, explanation),
            } as ChatResponse);
        }

        // ==================== QUESTIONING 단계 ====================
        // 규칙 엔진에 정의된 질문 목록을 순서대로 반환
        const totalSteps = DIAGNOSIS_QUESTIONS.length;
        if (currentStep < totalSteps) {
            const q = DIAGNOSIS_QUESTIONS[currentStep];
            return NextResponse.json({
                message: q.message,
                choices: q.choices,
                phase: 'questioning',
                currentStep: currentStep + 1,
                totalSteps,
                type: q.type,
                questionId: q.id,
            } as ChatResponse, { status: 200 });
        }

        // 모든 질문 완료 → 훅이 analyzing을 트리거
        return NextResponse.json({
            message: '모든 질문이 완료되었습니다. 분석을 시작합니다...',
            choices: [],
            phase: 'questioning',
            currentStep: currentStep + 1,
            totalSteps,
        } as ChatResponse, { status: 200 });

    } catch (error) {
        // 서버 오류 처리
        logger.error('/api/chat 오류:', error);
        return NextResponse.json(
            { error: 'AI 서비스 연결에 실패했습니다. 잠시 후 다시 시도해주세요.' },
            { status: 500 }
        );
    }
}
