'use client';

import { useEffect, useRef, useState } from 'react';
import { useChat } from '@/hooks/useChat';
import ChatMessage from './ChatMessage';
import ChoiceChips from './ChoiceChips';
import TextInput from './TextInput';
import RetryButton from './RetryButton';
import LoadingIndicator from './LoadingIndicator';
import ProgressBar from './ProgressBar';
import ResultCard from '@/components/result/ResultCard';
import BranchCard from '@/components/result/BranchCard';
import MapWidget from '@/components/result/MapWidget';
import RegionSelector from './RegionSelector';
import { Branch } from '@/types/db';
import { ArrowLeft } from 'lucide-react';
import { logger } from '@/lib/logger';
import { SIDO_LIST } from '@/lib/regions';
import { NUMBER_LIMITS } from '@/lib/eligibility/answers';

/** questionId가 숫자 범위 제한이 있는 질문인지 (age, monthlyIncome) */
function isNumberLimitKey(id: string | null): id is keyof typeof NUMBER_LIMITS {
    return id !== null && id in NUMBER_LIMITS;
}

export default function ChatContainer() {
    const {
        messages,
        isLoading,
        currentStep,
        totalSteps,
        phase,
        result,
        isError,
        questionId,
        questionType,
        canGoBack,
        sendChoice,
        sendText,
        goBack,
        retry,
        startChat,
    } = useChat();

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const resultRef = useRef<HTMLDivElement>(null);
    const [branch, setBranch] = useState<Branch | null | 'loading' | 'none'>('none');
    const [numberError, setNumberError] = useState('');

    useEffect(() => {
        startChat();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        // 결과 화면일 경우 결과 카드 상단으로 스크롤 고정
        if (phase === 'result' && resultRef.current) {
            resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isLoading, branch, phase]);

    useEffect(() => {
        // 질문이 바뀌면(이전 질문으로 돌아간 경우 포함) 이전 단계의 숫자 입력 에러를 지운다.
        setNumberError('');
    }, [currentStep]);

    const handleRegionSelect = async (sido: string, sigungu: string) => {
        setBranch('loading');

        try {
            const response = await fetch(
                `/api/branches?sido=${encodeURIComponent(sido)}&sigungu=${encodeURIComponent(sigungu)}`
            );
            const data = await response.json();

            if (data.branch) {
                setBranch(data.branch as Branch);
            } else {
                setBranch(null);
            }
        } catch (error) {
            logger.error('지점 조회 오류:', error);
            setBranch(null);
        }
    };

    useEffect(() => {
        if (phase === 'result' && branch === 'none' && result && result.type !== '제한') {
            const regionMessage = messages.find((m) => m.role === 'user' && SIDO_LIST.some(sido => m.content.startsWith(sido)));

            if (regionMessage) {
                const parts = regionMessage.content.split(' ');
                if (parts.length >= 2) {
                    handleRegionSelect(parts[0], parts.slice(1).join(' '));
                }
            }
        }
    }, [phase, result, branch, messages]);

    const lastAIMessage = [...messages].reverse().find((m) => m.role === 'ai');
    const currentChoices = lastAIMessage?.choices ?? [];

    // 현재 질문이 지역 선택형인지 확인
    const isRegionStep = phase === 'questioning' && questionType === 'region';
    const isNumberStep = phase === 'questioning' && questionType === 'number' && !isLoading && !isError;

    const showInput =
        !isLoading &&
        !isError &&
        !isRegionStep &&
        phase !== 'result' &&
        phase !== 'ended' &&
        branch === 'none' &&
        currentChoices.length > 0;

    return (
        <div className="flex flex-col h-full relative">
            {/* 상단 진행률 바 & 이전 버튼 (고정) */}
            <div className="absolute top-0 left-0 w-full z-30 px-4 md:px-8 pt-[80px] md:pt-[100px] flex flex-col pointer-events-none gap-4">
                <div className="w-full max-w-4xl mx-auto flex flex-col gap-4 pointer-events-auto">
                    {(phase === 'questioning' || phase === 'analyzing' || phase === 'result') && (
                        <ProgressBar current={phase === 'questioning' ? currentStep : totalSteps} total={totalSteps} />
                    )}

                    {/* 이전으로 돌아가기 버튼 (result 화면 제외) */}
                    {canGoBack && !isLoading && phase !== 'result' && (
                        <div className="flex justify-start mt-2">
                            <button
                                onClick={goBack}
                                className="flex items-center gap-2 px-4 py-2 bg-bg-elevated border border-[rgba(15,0,0,0.12)] rounded-[4px] text-sm font-medium text-text-secondary hover:text-text hover:bg-bg-elevated transition-all duration-300"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                이전 질문
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* 1-View 1-Question 중앙 메인 콘텐츠 영역 (스크롤) */}
            <div className="flex-1 overflow-y-auto px-6">
                <div className={`min-h-[calc(100vh-80px)] flex flex-col w-full mx-auto ${phase === 'result' ? 'max-w-[1600px] pt-[80px] md:pt-[100px] pb-6' : 'max-w-4xl pt-[180px] md:pt-[200px] pb-32'
                    }`}>
                    <div className={`w-full flex flex-col items-center ${phase === 'result' ? 'flex-1' : 'my-auto'}`}>
                        {phase === 'result' ? (
                            <div key="result-view" className="w-full flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-stretch animate-reveal-up pb-4">
                                <div className="flex flex-col h-full">
                                    {result && <ResultCard result={result} />}
                                </div>
                                <div className="flex flex-col h-full">
                                    {branch !== 'loading' && result && (
                                        <BranchCard branch={branch === 'none' ? null : branch} diagnosisType={result.type} />
                                    )}
                                </div>
                            </div>
                        ) : isLoading ? (
                            <div key="loading" className="flex justify-center items-center py-20 animate-fade-in">
                                <LoadingIndicator mode={phase === 'analyzing' ? 'analyzing' : 'bubble'} />
                            </div>
                        ) : lastAIMessage ? (
                            <div key={lastAIMessage.id} className="w-full flex flex-col items-center animate-reveal-up">
                                {/* 질문 영역 */}
                                <div className="w-full mb-12">
                                    <ChatMessage message={lastAIMessage} />
                                </div>

                                {/* 상황별 추가 UI 조건부 렌더링 */}
                                {isRegionStep && (
                                    <div className="w-full max-w-2xl mb-12 animate-fade-in">
                                        <RegionSelector
                                            onSelect={(sido, sigungu) => {
                                                sendText(`${sido} ${sigungu}`);
                                            }}
                                            disabled={isLoading}
                                        />
                                    </div>
                                )}

                                {isNumberStep && (
                                    <div className="w-full max-w-md mb-12 animate-fade-in">
                                        <TextInput
                                            inputMode="numeric"
                                            placeholder={lastAIMessage.content.includes('만 원') ? '예: 250' : '예: 28'}
                                            disabled={isLoading}
                                            onSubmit={(text) => {
                                                if (!/^\d{1,6}$/.test(text)) {
                                                    setNumberError('숫자만 입력해 주세요.');
                                                    return;
                                                }
                                                if (isNumberLimitKey(questionId)) {
                                                    const { min, max } = NUMBER_LIMITS[questionId];
                                                    const value = Number(text);
                                                    if (value < min || value > max) {
                                                        setNumberError(`${min}~${max} 사이 숫자로 입력해 주세요.`);
                                                        return;
                                                    }
                                                }
                                                setNumberError('');
                                                sendText(text);
                                            }}
                                        />
                                        {numberError && <p role="alert" className="mt-2 text-sm text-danger">{numberError}</p>}
                                    </div>
                                )}

                                {/* 에러 발생 시 재시도 버튼 대체 표시 */}
                                {isError && (
                                    <div className="mt-8 flex justify-center">
                                        <RetryButton onRetry={retry} />
                                    </div>
                                )}

                                {/* 입력 컨트롤 영역: 중앙 질문 바로 아래에 배치 */}
                                {showInput && (
                                    <div className="w-full max-w-3xl animate-fade-in" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
                                        <div className="bg-bg-elevated border border-[rgba(15,0,0,0.12)] rounded-[4px] p-4">
                                            <ChoiceChips
                                                choices={currentChoices}
                                                onSelect={sendChoice}
                                                onTextSubmit={sendText}
                                                disabled={isLoading}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}
