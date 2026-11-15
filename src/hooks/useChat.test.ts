import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_INFO_MESSAGE, DEFAULT_INTRO_MESSAGE } from '@/lib/prompts';
import { chatRequestSchema } from '@/lib/validations';
import type { DiagnosisResult, Message } from './useChat';
import { buildChatRequestBody, chatReducer, initialState, toReceivePayload, isQuestionsDone } from './useChat';

vi.mock('@/lib/db', () => ({ getSetting: vi.fn() }));

describe('isQuestionsDone', () => {
    it('phase가 questioning이고 currentStep이 totalSteps를 초과할 때만 true', () => {
        expect(isQuestionsDone({ phase: 'questioning', currentStep: 13, totalSteps: 12 })).toBe(true);
    });

    it('currentStep이 totalSteps 이하면 false', () => {
        expect(isQuestionsDone({ phase: 'questioning', currentStep: 12, totalSteps: 12 })).toBe(false);
    });

    it('phase가 questioning이 아니면 false', () => {
        expect(isQuestionsDone({ phase: 'analyzing', currentStep: 13, totalSteps: 12 })).toBe(false);
    });

    it('currentStep이 없으면 false', () => {
        expect(isQuestionsDone({ phase: 'questioning', totalSteps: 12 })).toBe(false);
    });

    it('totalSteps가 없으면 false', () => {
        expect(isQuestionsDone({ phase: 'questioning', currentStep: 13 })).toBe(false);
    });
});

describe('chatReducer - RECEIVE_RESPONSE', () => {
    it('questionId/questionType/totalSteps를 payload대로 설정한다', () => {
        const payload = toReceivePayload({
            message: '질문', phase: 'questioning', currentStep: 2, totalSteps: 12,
            questionId: 'age', type: 'number',
        });
        const next = chatReducer(initialState, { type: 'RECEIVE_RESPONSE', payload });

        expect(next.questionId).toBe('age');
        expect(next.questionType).toBe('number');
        expect(next.totalSteps).toBe(12);
    });

    it('questionId가 응답에 없으면 null로 초기화한다', () => {
        const payload = toReceivePayload({ message: '완료', phase: 'questioning', currentStep: 13, totalSteps: 12 });
        const next = chatReducer(initialState, { type: 'RECEIVE_RESPONSE', payload });

        expect(next.questionId).toBeNull();
        expect(next.questionType).toBeNull();
    });
});

describe('chatReducer - SAVE_SNAPSHOT / GO_BACK', () => {
    it('스냅샷 저장 후 상태를 바꾼 뒤 GO_BACK하면 이전 질문/답변 상태로 복원된다', () => {
        const withFirstQuestion = chatReducer(initialState, {
            type: 'RECEIVE_RESPONSE',
            payload: toReceivePayload({
                message: 'q1', phase: 'questioning', currentStep: 1, totalSteps: 12,
                questionId: 'age', type: 'number',
            }),
        });
        const snapshotted = chatReducer(withFirstQuestion, { type: 'SAVE_SNAPSHOT' });

        const afterSecondQuestion = chatReducer(snapshotted, {
            type: 'RECEIVE_RESPONSE',
            payload: toReceivePayload({
                message: 'q2', phase: 'questioning', currentStep: 2, totalSteps: 12,
                questionId: 'status', type: 'choice',
            }),
        });
        const withNewAnswer = { ...afterSecondQuestion, userAnswers: { age: '28', status: 'unemployed' } };

        const restored = chatReducer(withNewAnswer, { type: 'GO_BACK' });

        expect(restored.questionId).toBe('age');
        expect(restored.questionType).toBe('number');
        expect(restored.totalSteps).toBe(12);
        expect(restored.userAnswers).toEqual({});
        expect(restored.currentStep).toBe(1);
    });

    it('이전 기록(stateHistory)이 없으면 GO_BACK은 동일한 상태를 반환한다', () => {
        const result = chatReducer(initialState, { type: 'GO_BACK' });

        expect(result).toBe(initialState);
    });
});

describe('GO_BACK_TO', () => {
    const q = (id: string, step: number) => toReceivePayload({ message: id, phase: 'questioning', currentStep: step, totalSteps: 12, questionId: id, type: 'choice' });
    function answered() {
        let s = chatReducer(initialState, { type: 'RECEIVE_RESPONSE', payload: q('age', 1) });
        s = chatReducer(s, { type: 'SAVE_SNAPSHOT' });                                  // age 화면 스냅샷
        s = chatReducer(s, { type: 'ADD_USER_DATA', payload: { historyEntry: { role: 'user', content: '17' }, answers: { age: '17' } } });
        s = chatReducer(s, { type: 'RECEIVE_RESPONSE', payload: q('militaryMonths', 2) });
        s = chatReducer(s, { type: 'SAVE_SNAPSHOT' });                                  // militaryMonths 화면 스냅샷
        s = chatReducer(s, { type: 'ADD_USER_DATA', payload: { historyEntry: { role: 'user', content: '1년 이하' }, answers: { age: '17', militaryMonths: '12' } } });
        return chatReducer(s, { type: 'RECEIVE_RESPONSE', payload: q('status', 3) });
    }
    it('지정한 질문 화면까지 되돌리고 그 이후 답변을 지운다', () => {
        const s = chatReducer(answered(), { type: 'GO_BACK_TO', payload: { questionId: 'age' } });
        expect(s.questionId).toBe('age');
        expect(s.userAnswers).toEqual({});
        expect(s.stateHistory).toHaveLength(0);
    });
    it('마지막 질문만 되돌릴 수도 있다', () => {
        const s = chatReducer(answered(), { type: 'GO_BACK_TO', payload: { questionId: 'militaryMonths' } });
        expect(s.questionId).toBe('militaryMonths');
        expect(s.userAnswers).toEqual({ age: '17' });
    });
    it('스냅샷에 없는 질문이면 상태 불변', () => {
        const before = answered();
        expect(chatReducer(before, { type: 'GO_BACK_TO', payload: { questionId: 'region' } })).toBe(before);
    });
});

describe('history 생성 — 안내(info) 메시지 제외 (Bug A, 순수 함수)', () => {
    it('info 응답은 historyEntry가 null이고 questioning 응답은 null이 아니다', () => {
        expect(toReceivePayload({ ...DEFAULT_INFO_MESSAGE[0], phase: 'info' }).historyEntry).toBeNull();
        expect(toReceivePayload({ message: '만 나이를 입력해 주세요.', phase: 'questioning', currentStep: 1, totalSteps: 12, questionId: 'age', type: 'number' }).historyEntry)
            .toEqual({ role: 'model', content: '만 나이를 입력해 주세요.' });
    });
    it('리듀서는 null historyEntry를 history에 넣지 않지만 화면 messages에는 안내문을 넣는다', () => {
        const s = chatReducer(initialState, { type: 'RECEIVE_RESPONSE', payload: toReceivePayload({ ...DEFAULT_INFO_MESSAGE[0], phase: 'info' }) });
        expect(s.history).toEqual([]);
        expect(s.messages.at(-1)?.content).toBe(DEFAULT_INFO_MESSAGE[0].message);
    });
    it('intro/info 응답의 currentStep은 0으로 고정된다(안내문 currentStep: 1로 나이 질문이 건너뛰어지는 결함)', () => {
        expect(toReceivePayload({ message: '안내', phase: 'info', currentStep: 1, totalSteps: 12 }).currentStep).toBe(0);
        expect(toReceivePayload({ message: 'q', phase: 'questioning', currentStep: 2 }).currentStep).toBe(2);
    });
});

describe('"국민취업제도란? → 시작하기" 흐름 (Bug A, 흐름)', () => {
    it('시작하기 요청 바디가 서버 스키마를 통과하고 첫 질문은 age다', () => {
        // Arrange: intro 표시 → "국민취업지원제도란?" 선택 → info 표시
        let s = chatReducer(initialState, { type: 'START_CHAT_SUCCESS', payload: { introMessage: { id: '1', role: 'ai', content: DEFAULT_INTRO_MESSAGE[0].message, timestamp: new Date() } } });
        s = chatReducer(s, { type: 'RECEIVE_RESPONSE', payload: toReceivePayload({ ...DEFAULT_INTRO_MESSAGE[0], phase: 'intro' }) });
        s = chatReducer(s, { type: 'ADD_USER_DATA', payload: { historyEntry: { role: 'user', content: 'ℹ️ 국민취업지원제도란?' }, answers: {} } });
        s = chatReducer(s, { type: 'RECEIVE_RESPONSE', payload: toReceivePayload({ ...DEFAULT_INFO_MESSAGE[0], phase: 'info' }) });
        // Act: "네, 시작하겠습니다!" → questioning 요청 바디
        const body = buildChatRequestBody(s, 'questioning', { role: 'user', content: '✅ 네, 시작하겠습니다!' });
        // Assert
        expect(chatRequestSchema.safeParse(body).success).toBe(true);     // 현재 코드: 2,165자 model 메시지로 false
        expect(body.currentStep).toBe(0);                                  // 서버가 DIAGNOSIS_QUESTIONS[0](age)을 돌려준다
        expect(body.messages.every(m => m.content.length <= 1000)).toBe(true);
    });
    it('인트로 문구는 history에 남으므로 1000자 이하여야 한다', () => {
        expect(DEFAULT_INTRO_MESSAGE[0].message.length).toBeLessThanOrEqual(1000);
    });
});

describe('chatReducer - 기타 액션 (SET_LOADING·PREPARE_SEND·ADD_USER_DATA·분석·오류·초기화)', () => {
    const aiMsg = (content: string): Message => ({ id: 'm1', role: 'ai', content, timestamp: new Date() });
    const userMsg = (content: string): Message => ({ id: 'm2', role: 'user', content, timestamp: new Date() });

    it('SET_LOADING은 isLoading만 바꾼다', () => {
        const next = chatReducer(initialState, { type: 'SET_LOADING', payload: true });
        expect(next.isLoading).toBe(true);
        expect(next.messages).toEqual(initialState.messages);
    });

    it('PREPARE_SEND는 로딩 시작·오류 초기화·사용자 메시지 추가·lastAction 저장', () => {
        const msg = userMsg('예');
        const next = chatReducer({ ...initialState, isError: true }, {
            type: 'PREPARE_SEND',
            payload: { lastAction: { type: 'choice', data: { id: 'c1', label: '예', value: 'yes' } }, userMessage: msg },
        });
        expect(next.isLoading).toBe(true);
        expect(next.isError).toBe(false);
        expect(next.messages).toEqual([msg]);
        expect(next.lastAction).toEqual({ type: 'choice', data: { id: 'c1', label: '예', value: 'yes' } });
    });

    it('ADD_USER_DATA는 history에 항목을 추가하고 userAnswers를 교체한다', () => {
        const next = chatReducer(initialState, {
            type: 'ADD_USER_DATA',
            payload: { historyEntry: { role: 'user', content: '28' }, answers: { age: '28' } },
        });
        expect(next.history).toEqual([{ role: 'user', content: '28' }]);
        expect(next.userAnswers).toEqual({ age: '28' });
    });

    it('START_ANALYSIS는 analyzing 단계로 전환하고 로딩 메시지를 추가한다', () => {
        const loadingMessage = aiMsg('🔍 AI가 요건을 검토 중입니다...');
        const next = chatReducer(initialState, {
            type: 'START_ANALYSIS',
            payload: { loadingMessage, lastAction: { type: 'analysis', data: {} } },
        });
        expect(next.phase).toBe('analyzing');
        expect(next.isLoading).toBe(true);
        expect(next.messages).toEqual([loadingMessage]);
    });

    it('ANALYSIS_SUCCESS는 로딩 메시지를 결과 메시지로 교체하고 result/phase를 설정한다', () => {
        const afterStart = chatReducer(initialState, {
            type: 'START_ANALYSIS',
            payload: { loadingMessage: aiMsg('검토 중...'), lastAction: null },
        });
        const result: DiagnosisResult = { type: '1유형_선발형', description: '설명' };
        const resultMessage = aiMsg('결과');
        const next = chatReducer(afterStart, { type: 'ANALYSIS_SUCCESS', payload: { resultMessage, result } });

        expect(next.phase).toBe('result');
        expect(next.result).toEqual(result);
        expect(next.messages).toEqual([resultMessage]);
    });

    it('SET_ERROR는 "검토 중" 로딩 메시지가 있으면 교체하고, 없으면 끝에 추가한다', () => {
        const withLoading = chatReducer(initialState, {
            type: 'START_ANALYSIS',
            payload: { loadingMessage: aiMsg('🔍 AI가 요건을 검토 중입니다...'), lastAction: null },
        });
        const errorMessage = aiMsg('오류');
        const replaced = chatReducer(withLoading, { type: 'SET_ERROR', payload: { errorMessage } });
        expect(replaced.messages).toEqual([errorMessage]);
        expect(replaced.isError).toBe(true);

        const otherError = aiMsg('오류2');
        const appended = chatReducer(initialState, { type: 'SET_ERROR', payload: { errorMessage: otherError } });
        expect(appended.messages).toEqual([otherError]);
    });

    it('REMOVE_LAST_MESSAGES는 끝에서 count개를 제거한다', () => {
        const withThree = { ...initialState, messages: [aiMsg('a'), aiMsg('b'), aiMsg('c')] };
        const next = chatReducer(withThree, { type: 'REMOVE_LAST_MESSAGES', payload: { count: 2 } });
        expect(next.messages).toHaveLength(1);
        expect(next.messages[0].content).toBe('a');
    });

    it('START_CHAT_SUCCESS는 메시지를 인트로 1개로 교체하고 phase를 intro로 둔다', () => {
        const introMessage = aiMsg('안녕하세요');
        const next = chatReducer({ ...initialState, isLoading: true, phase: 'result' }, {
            type: 'START_CHAT_SUCCESS',
            payload: { introMessage },
        });
        expect(next.messages).toEqual([introMessage]);
        expect(next.phase).toBe('intro');
        expect(next.isLoading).toBe(false);
    });

    it('START_CHAT_ERROR는 오류 메시지만 남기고 로딩을 해제한다', () => {
        const errorMessage = aiMsg('시작 오류');
        const next = chatReducer({ ...initialState, isLoading: true }, {
            type: 'START_CHAT_ERROR',
            payload: { errorMessage },
        });
        expect(next.messages).toEqual([errorMessage]);
        expect(next.isLoading).toBe(false);
    });

    it('RESET은 초기 상태로 되돌린다', () => {
        const dirty = { ...initialState, currentStep: 5, messages: [aiMsg('x')] };
        expect(chatReducer(dirty, { type: 'RESET' })).toEqual(initialState);
    });

    it('정의되지 않은 액션은 상태를 그대로 반환한다', () => {
        const unknownAction = { type: 'UNKNOWN' } as unknown as Parameters<typeof chatReducer>[1];
        expect(chatReducer(initialState, unknownAction)).toBe(initialState);
    });
});
