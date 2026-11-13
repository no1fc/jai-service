'use client';

import { useEffect, useRef, useState } from 'react';
import LoadingIndicator from './LoadingIndicator';
import ResultCard from '@/components/result/ResultCard';
import BranchCard from '@/components/result/BranchCard';
import LeadForm from '@/components/lead/LeadForm';
import LeadModal from '@/components/lead/LeadModal';
import type { DiagnosisResult, BranchState } from '@/types/chat';

interface ResultSectionProps {
    result: DiagnosisResult;
    branch: BranchState;
    userAnswers: Record<string, string>;
}

const AUTO_OPEN_DELAY_MS = 1500;

/**
 * 모의진단 결과 화면.
 * 결과 카드, 지점 카드(조회 전·조회 중엔 로딩 자리표시), 상담 신청 모달을 조립한다.
 * ChatContainer에서 분리됨(Task 4). 결과 진입 1.5초 후 상담 신청 모달을 1회 자동으로 연다(D-12).
 */
export default function ResultSection({ result, branch, userAnswers }: ResultSectionProps) {
    const [leadOpen, setLeadOpen] = useState(false);
    const [leadDone, setLeadDone] = useState(false);
    const autoOpened = useRef(false);

    useEffect(() => {
        if (autoOpened.current) return;
        const timer = setTimeout(() => {
            autoOpened.current = true;
            setLeadOpen(true);
        }, AUTO_OPEN_DELAY_MS);
        return () => clearTimeout(timer);
    }, []);

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
                <button type="button" onClick={() => setLeadOpen(true)} disabled={leadDone}
                    className="h-12 w-full max-w-xl mx-auto bg-accent text-white font-bold rounded-[var(--radius-default)] hover:bg-accent-hover disabled:opacity-60 block">
                    {leadDone ? '접수 완료' : '무료 1:1 상담 신청'}
                </button>
            </div>
            <LeadModal open={leadOpen} onClose={() => setLeadOpen(false)}>
                <LeadForm
                    source="diagnosis"
                    payload={{ answers: userAnswers, result }}
                    defaultRegion={(userAnswers.region ?? '').split(' ')[0]}
                    onDone={() => setLeadDone(true)}
                />
            </LeadModal>
        </div>
    );
}
