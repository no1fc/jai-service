'use client';

import ChatContainer from '@/components/chat/ChatContainer';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function ChatPage() {
    return (
        <div className="h-[calc(100dvh-56px)] bg-bg overflow-hidden">
            {/* 메인 채팅 영역 */}
            <main className="h-full flex flex-col relative overflow-hidden">
                <ErrorBoundary section="채팅">
                    <ChatContainer />
                </ErrorBoundary>
            </main>
        </div>
    );
}
