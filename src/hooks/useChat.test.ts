import { describe, expect, it } from 'vitest';
import { chatReducer, initialState, toReceivePayload, isQuestionsDone } from './useChat';

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
