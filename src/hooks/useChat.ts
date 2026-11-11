/**
 * useChat 커스텀 훅
 * 챗봇의 전체 상태 관리, API 통신, 단계 진행을 담당하는 핵심 훅입니다.
 * ChatContainer 컴포넌트에서 사용됩니다.
 *
 * useReducer로 상태를 통합 관리하여 일관성과 예측 가능성을 보장합니다.
 */

'use client';

import { useReducer, useCallback } from 'react';
import { logger } from '@/lib/logger';
import type {
    Choice,
    Message,
    DiagnosisResult,
    ChatPhase,
    ChatStateSnapshot,
    UseChatReturn,
    QuestionType,
} from '@/types/chat';

// 타입 re-export (기존 임포트 호환)
export type { Choice, Message, DiagnosisResult, ChatPhase, ChatStateSnapshot, UseChatReturn, QuestionType } from '@/types/chat';

// ====================================
// 헬퍼 함수
// ====================================

function generateId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function createAIMessage(content: string, choices?: Choice[]): Message {
    return {
        id: generateId(),
        role: 'ai',
        content,
        choices,
        timestamp: new Date(),
    };
}

function createUserMessage(content: string): Message {
    return {
        id: generateId(),
        role: 'user',
        content,
        timestamp: new Date(),
    };
}

/** /api/chat 응답 → RECEIVE_RESPONSE payload */
function toReceivePayload(data: {
    message: string; choices?: Choice[]; phase?: ChatPhase; currentStep?: number; totalSteps?: number;
    questionId?: string; type?: QuestionType; result?: DiagnosisResult;
}) {
    return {
        aiMessage: createAIMessage(data.message, data.choices),
        historyEntry: { role: 'model' as const, content: data.message },
        phase: data.phase,
        currentStep: data.currentStep,
        totalSteps: data.totalSteps,
        questionId: data.questionId ?? null,
        questionType: data.type ?? null,
        result: data.phase === 'result' && data.result ? data.result : undefined,
    };
}

/** 마지막 질문까지 답했는지 */
const isQuestionsDone = (data: { phase?: string; currentStep?: number; totalSteps?: number }) =>
    data.phase === 'questioning' && data.currentStep !== undefined && data.totalSteps !== undefined
    && data.currentStep > data.totalSteps;

// ====================================
// Reducer 타입 정의
// ====================================

interface ChatState {
    messages: Message[];
    isLoading: boolean;
    currentStep: number;
    phase: ChatPhase;
    userAnswers: Record<string, string>;
    history: Array<{ role: 'user' | 'model'; content: string }>;
    result: DiagnosisResult | null;
    questionId: string | null;
    questionType: QuestionType | null;
    totalSteps: number;
    isError: boolean;
    lastAction: { type: 'choice' | 'text' | 'analysis'; data: unknown } | null;
    stateHistory: ChatStateSnapshot[];
}

type ChatAction =
    | { type: 'SAVE_SNAPSHOT' }
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'PREPARE_SEND'; payload: { lastAction: ChatState['lastAction']; userMessage: Message } }
    | { type: 'ADD_USER_DATA'; payload: { historyEntry: { role: 'user'; content: string }; answers: Record<string, string> } }
    | {
        type: 'RECEIVE_RESPONSE'; payload: {
            aiMessage: Message; historyEntry: { role: 'model'; content: string }; phase?: ChatPhase;
            currentStep?: number; totalSteps?: number; questionId?: string | null; questionType?: QuestionType | null;
            result?: DiagnosisResult;
        };
    }
    | { type: 'START_ANALYSIS'; payload: { loadingMessage: Message; lastAction: ChatState['lastAction'] } }
    | { type: 'ANALYSIS_SUCCESS'; payload: { resultMessage: Message; result: DiagnosisResult } }
    | { type: 'SET_ERROR'; payload: { errorMessage: Message } }
    | { type: 'REMOVE_LAST_MESSAGES'; payload: { count: number } }
    | { type: 'START_CHAT_SUCCESS'; payload: { introMessage: Message } }
    | { type: 'START_CHAT_ERROR'; payload: { errorMessage: Message } }
    | { type: 'GO_BACK' }
    | { type: 'RESET' };

// ====================================
// 초기 상태 & Reducer (훅 외부 — 호이스팅 안전)
// ====================================

const initialState: ChatState = {
    messages: [],
    isLoading: false,
    currentStep: 0,
    phase: 'intro',
    userAnswers: {},
    history: [],
    result: null,
    questionId: null,
    questionType: null,
    totalSteps: 12,
    isError: false,
    lastAction: null,
    stateHistory: [],
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
    switch (action.type) {
        case 'SAVE_SNAPSHOT':
            return {
                ...state,
                stateHistory: [
                    ...state.stateHistory,
                    {
                        messages: [...state.messages],
                        currentStep: state.currentStep,
                        phase: state.phase,
                        userAnswers: { ...state.userAnswers },
                        history: [...state.history],
                        result: state.result,
                        questionId: state.questionId,
                        questionType: state.questionType,
                        totalSteps: state.totalSteps,
                    },
                ],
            };

        case 'SET_LOADING':
            return { ...state, isLoading: action.payload };

        case 'PREPARE_SEND':
            return {
                ...state,
                isLoading: true,
                isError: false,
                lastAction: action.payload.lastAction,
                messages: [...state.messages, action.payload.userMessage],
            };

        case 'ADD_USER_DATA':
            return {
                ...state,
                history: [...state.history, action.payload.historyEntry],
                userAnswers: action.payload.answers,
            };

        case 'RECEIVE_RESPONSE': {
            const { aiMessage, historyEntry, phase, currentStep, totalSteps, questionId, questionType, result } = action.payload;
            return {
                ...state,
                messages: [...state.messages, aiMessage],
                history: [...state.history, historyEntry],
                lastAction: null,
                isLoading: false,
                questionId: questionId ?? null,
                questionType: questionType ?? null,
                ...(currentStep !== undefined && { currentStep }),
                ...(totalSteps !== undefined && { totalSteps }),
                ...(phase !== undefined && { phase }),
                ...(result && { result }),
            };
        }

        case 'START_ANALYSIS':
            return {
                ...state,
                phase: 'analyzing',
                isLoading: true,
                isError: false,
                lastAction: action.payload.lastAction,
                messages: [...state.messages, action.payload.loadingMessage],
            };

        case 'ANALYSIS_SUCCESS':
            return {
                ...state,
                result: action.payload.result,
                phase: 'result',
                isLoading: false,
                lastAction: null,
                messages: [
                    ...state.messages.slice(0, -1),
                    action.payload.resultMessage,
                ],
            };

        case 'SET_ERROR':
            return {
                ...state,
                isError: true,
                isLoading: false,
                messages: state.messages[state.messages.length - 1]?.content.includes('검토 중')
                    ? [...state.messages.slice(0, -1), action.payload.errorMessage]
                    : [...state.messages, action.payload.errorMessage],
            };

        case 'REMOVE_LAST_MESSAGES':
            return {
                ...state,
                messages: state.messages.slice(0, -action.payload.count),
            };

        case 'START_CHAT_SUCCESS':
            return {
                ...state,
                messages: [action.payload.introMessage],
                phase: 'intro',
                isLoading: false,
            };

        case 'START_CHAT_ERROR':
            return {
                ...state,
                messages: [action.payload.errorMessage],
                isLoading: false,
            };

        case 'GO_BACK': {
            if (state.isLoading || state.stateHistory.length === 0) return state;
            const prev = state.stateHistory[state.stateHistory.length - 1];
            return {
                ...state,
                messages: prev.messages,
                currentStep: prev.currentStep,
                phase: prev.phase,
                userAnswers: prev.userAnswers,
                history: prev.history,
                result: prev.result,
                questionId: prev.questionId,
                questionType: prev.questionType,
                totalSteps: prev.totalSteps,
                stateHistory: state.stateHistory.slice(0, -1),
                isError: false,
                lastAction: null,
            };
        }

        case 'RESET':
            return initialState;

        default:
            return state;
    }
}

// ====================================
// useChat 훅 본체
// ====================================

export function useChat(): UseChatReturn {
    const [state, dispatch] = useReducer(chatReducer, initialState);

    /**
     * /api/chat 호출 공통 함수
     */
    const callChatAPI = useCallback(
        async (
            currentPhase: ChatPhase,
            newHistory: Array<{ role: 'user' | 'model'; content: string }>,
            answers: Record<string, string>,
            currentStepForAPI?: number
        ) => {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: newHistory,
                    phase: currentPhase,
                    userAnswers: answers,
                    currentStep: currentStepForAPI,
                }),
            });

            if (!response.ok) {
                throw new Error(`API 오류: ${response.status}`);
            }

            return response.json();
        },
        []
    );

    /**
     * 최종 유형 판별 분석 트리거 함수
     * (sendChoice/sendText보다 먼저 정의하여 호이스팅 이슈 해결)
     */
    const triggerAnalysis = useCallback(
        async (
            currentHistory: Array<{ role: 'user' | 'model'; content: string }>,
            answers: Record<string, string>,
            step: number
        ) => {
            dispatch({
                type: 'START_ANALYSIS',
                payload: {
                    loadingMessage: createAIMessage('🔍 AI가 요건을 검토 중입니다...'),
                    lastAction: { type: 'analysis', data: { history: currentHistory, answers } },
                },
            });

            try {
                const data = await callChatAPI('analyzing', currentHistory, answers, step);

                if (data.result) {
                    dispatch({
                        type: 'ANALYSIS_SUCCESS',
                        payload: {
                            result: data.result as DiagnosisResult,
                            resultMessage: createAIMessage(data.message),
                        },
                    });
                } else {
                    dispatch({
                        type: 'SET_ERROR',
                        payload: { errorMessage: createAIMessage(data.message || '분석 결과를 처리하는 중 오류가 발생했습니다.') },
                    });
                }
            } catch {
                dispatch({
                    type: 'SET_ERROR',
                    payload: { errorMessage: createAIMessage('분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.') },
                });
            }
        },
        [callChatAPI]
    );

    /**
     * 선택지 전송 함수 (객관식 버튼 클릭 시)
     */
    const sendChoice = useCallback(async (choice: Choice) => {
        if (state.isLoading) return;

        // 스냅샷 저장 — reducer에서 현재 state를 직접 읽어 stale closure 문제 없음
        dispatch({ type: 'SAVE_SNAPSHOT' });
        dispatch({
            type: 'PREPARE_SEND',
            payload: {
                lastAction: { type: 'choice', data: choice },
                userMessage: createUserMessage(choice.label),
            },
        });

        try {
            const newHistory = [...state.history, { role: 'user' as const, content: choice.label }];

            // 단계 전환 로직
            let nextPhase: ChatPhase = state.phase;
            if (state.phase === 'intro') {
                if (choice.value === 'start') nextPhase = 'questioning';
                else if (choice.value === 'info') nextPhase = 'info';
            } else if (state.phase === 'info') {
                if (choice.value === 'start') nextPhase = 'questioning';
            }

            const newAnswers = state.questionId
                ? { ...state.userAnswers, [state.questionId]: choice.value }
                : state.userAnswers;

            dispatch({
                type: 'ADD_USER_DATA',
                payload: {
                    historyEntry: { role: 'user', content: choice.label },
                    answers: newAnswers,
                },
            });

            const data = await callChatAPI(nextPhase, newHistory, newAnswers, state.currentStep);

            dispatch({ type: 'RECEIVE_RESPONSE', payload: toReceivePayload(data) });

            // analyzing 단계로 자동 전환 (마지막 질문 완료 시)
            if (isQuestionsDone(data)) {
                await triggerAnalysis(newHistory, newAnswers, state.currentStep);
            }
        } catch {
            dispatch({
                type: 'SET_ERROR',
                payload: { errorMessage: createAIMessage('응답 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.') },
            });
        }
    }, [state.isLoading, state.history, state.phase, state.currentStep, state.userAnswers, state.questionId, callChatAPI, triggerAnalysis]);

    /**
     * 텍스트 전송 함수 ('기타' 선택 후 자유 텍스트 입력 시)
     */
    const sendText = useCallback(async (text: string) => {
        if (state.isLoading || !text.trim()) return;

        dispatch({ type: 'SAVE_SNAPSHOT' });
        dispatch({
            type: 'PREPARE_SEND',
            payload: {
                lastAction: { type: 'text', data: text },
                userMessage: createUserMessage(text),
            },
        });

        try {
            const newHistory = [...state.history, { role: 'user' as const, content: text }];

            const newAnswers = state.questionId
                ? { ...state.userAnswers, [state.questionId]: text.trim() }
                : state.userAnswers;

            dispatch({
                type: 'ADD_USER_DATA',
                payload: {
                    historyEntry: { role: 'user', content: text },
                    answers: newAnswers,
                },
            });

            const data = await callChatAPI(state.phase, newHistory, newAnswers, state.currentStep);

            dispatch({ type: 'RECEIVE_RESPONSE', payload: toReceivePayload(data) });

            if (isQuestionsDone(data)) {
                await triggerAnalysis(newHistory, newAnswers, state.currentStep);
            }
        } catch {
            dispatch({
                type: 'SET_ERROR',
                payload: { errorMessage: createAIMessage('응답 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.') },
            });
        }
    }, [state.isLoading, state.history, state.phase, state.currentStep, state.userAnswers, state.questionId, callChatAPI, triggerAnalysis]);

    /**
     * 마지막 작업을 다시 시도하는 함수
     */
    const retry = useCallback(async () => {
        if (!state.lastAction || state.isLoading) return;

        dispatch({ type: 'REMOVE_LAST_MESSAGES', payload: { count: 1 } });

        if (state.lastAction.type === 'choice') {
            dispatch({ type: 'REMOVE_LAST_MESSAGES', payload: { count: 1 } });
            await sendChoice(state.lastAction.data as Choice);
        } else if (state.lastAction.type === 'text') {
            dispatch({ type: 'REMOVE_LAST_MESSAGES', payload: { count: 1 } });
            await sendText(state.lastAction.data as string);
        } else if (state.lastAction.type === 'analysis') {
            const actionData = state.lastAction.data as { history: Array<{ role: 'user' | 'model'; content: string }>; answers: Record<string, string> };
            await triggerAnalysis(actionData.history, actionData.answers, state.currentStep);
        }
    }, [state.lastAction, state.isLoading, state.currentStep, sendChoice, sendText, triggerAnalysis]);

    /**
     * 이전 대화로 돌아가기 함수
     */
    const goBack = useCallback(() => {
        dispatch({ type: 'GO_BACK' });
    }, []);

    /**
     * 챗봇 시작 함수
     */
    const startChat = useCallback(async () => {
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const data = await callChatAPI('intro', [], {}, 0);
            dispatch({
                type: 'START_CHAT_SUCCESS',
                payload: { introMessage: createAIMessage(data.message, data.choices) },
            });
        } catch (error) {
            logger.error('챗봇 시작 오류:', error);
            dispatch({
                type: 'START_CHAT_ERROR',
                payload: { errorMessage: createAIMessage('챗봇 시작 중 오류가 발생했습니다. 페이지를 새로고침해 주세요.') },
            });
        }
    }, [callChatAPI]);

    /**
     * 챗봇 상태 전체 초기화 함수
     */
    const resetChat = useCallback(() => {
        dispatch({ type: 'RESET' });
    }, []);

    return {
        messages: state.messages,
        isLoading: state.isLoading,
        currentStep: state.currentStep,
        totalSteps: state.totalSteps,
        phase: state.phase,
        result: state.result,
        isError: state.isError,
        questionType: state.questionType,
        canGoBack: state.stateHistory.length > 0,
        userAnswers: state.userAnswers,
        sendChoice,
        sendText,
        goBack,
        retry,
        startChat,
        resetChat,
    };
}
