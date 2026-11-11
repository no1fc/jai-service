'use client';

import { Message } from '@/hooks/useChat';
import { Sparkles } from 'lucide-react';

interface ChatMessageProps {
    message: Message;
    isLatest?: boolean; // 사용 안 할 수도 있지만 호환성을 위해 유지
}

export default function ChatMessage({ message, isLatest }: ChatMessageProps) {
    const isAI = message.role === 'ai';

    if (!isAI) return null; // 1-View 1-Question 구조에서는 사용자 메시지를 로깅만 하고 렌더링하지 않음

    return (
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto w-full">
            {/* 아이콘 상단 중앙 */}
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-[4px] bg-bg-elevated flex items-center justify-center border border-border mb-6">
                <Sparkles size={24} className="text-accent" />
            </div>

            <div className="text-xs md:text-sm font-black tracking-[0.2em] uppercase mb-4 md:mb-6 text-accent">
                Ness AI Mentor
            </div>

            <h2 className="text-xl md:text-2xl lg:text-2xl leading-[1.6] md:leading-[1.7] tracking-tight text-text font-semibold whitespace-pre-wrap break-keep">
                {message.content}
            </h2>
        </div>
    );
}
