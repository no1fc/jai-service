'use client';

import LoadingIndicator from './LoadingIndicator';
import ResultCard from '@/components/result/ResultCard';
import BranchCard from '@/components/result/BranchCard';
import LeadForm from '@/components/lead/LeadForm';
import type { DiagnosisResult, BranchState } from '@/types/chat';

interface ResultSectionProps {
    result: DiagnosisResult;
    branch: BranchState;
    userAnswers: Record<string, string>;
}

/**
 * 모의진단 결과 화면.
 * 결과 카드, 지점 카드(조회 전·조회 중엔 로딩 자리표시), 상담 신청 폼을 조립한다.
 * ChatContainer에서 분리됨(Task 4). Task 5가 여기에 상담 신청 모달을 추가할 예정.
 */
export default function ResultSection({ result, branch, userAnswers }: ResultSectionProps) {
    return (
        <div key="result-view" className="w-full flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-stretch animate-reveal-up pb-4">
            <div className="flex flex-col h-full">
                <ResultCard result={result} />
            </div>
            <div className="flex flex-col h-full">
                {branch === 'none' || branch === 'loading' ? (
                    <div className="w-full h-full min-h-[400px] flex justify-center items-center">
                        <LoadingIndicator mode="bubble" />
                    </div>
                ) : (
                    <BranchCard branch={branch} diagnosisType={result.type} />
                )}
            </div>
            <div className="lg:col-span-2 w-full max-w-xl mx-auto">
                <LeadForm
                    source="diagnosis"
                    payload={{ answers: userAnswers, result }}
                    defaultRegion={(userAnswers.region ?? '').split(' ')[0]}
                />
            </div>
        </div>
    );
}
