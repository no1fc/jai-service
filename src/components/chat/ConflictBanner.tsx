'use client';

import { QUESTION_LABEL, answerLabel, type Conflict } from '@/lib/eligibility/consistency';

interface ConflictBannerProps {
    conflicts: Conflict[];
    answers: Record<string, string>;
    onEdit: (questionId: string) => void;
}

/**
 * 모의진단 답변 모순 배너.
 * error면 danger 톤(선택지·입력은 ChatContainer가 숨긴다), warn이면 warning 톤으로 표시한다.
 * 각 모순의 관련 질문마다 "{질문 라벨} 수정: {현재 답}" 버튼을 보여주고, 누르면 그 질문 화면으로 되돌린다.
 */
export default function ConflictBanner({ conflicts, answers, onEdit }: ConflictBannerProps) {
    return (
        <div role="alert" className="w-full max-w-2xl mb-8 flex flex-col gap-3">
            {conflicts.map((conflict) => (
                <div
                    key={conflict.id}
                    className={`rounded-[var(--radius-card)] border p-4 flex flex-col gap-3 ${conflict.level === 'error' ? 'border-danger bg-danger/10' : 'border-warning bg-warning/10'
                        }`}
                >
                    <p className="text-sm text-text">{conflict.message}</p>
                    <div className="flex flex-wrap gap-2">
                        {conflict.questions.map((questionId) => (
                            <button
                                key={questionId}
                                type="button"
                                onClick={() => onEdit(questionId)}
                                className="min-h-11 px-4 rounded-[var(--radius-default)] border border-border-strong bg-bg-elevated text-sm font-medium text-text-secondary hover:text-text transition-all duration-300"
                            >
                                {QUESTION_LABEL[questionId]} 수정: {answerLabel(questionId, answers[questionId])}
                            </button>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
