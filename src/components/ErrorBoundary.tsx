'use client';

import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
    /** 섹션 이름 (에러 메시지에 표시) */
    section?: string;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

/**
 * React Error Boundary 컴포넌트.
 * 자식 컴포넌트 렌더링 오류를 잡아 전체 앱 크래시를 방지합니다.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // 프로덕션에서는 로깅 서비스로 전송 (현재는 콘솔)
        if (process.env.NODE_ENV === 'development') {
            console.error(`[ErrorBoundary${this.props.section ? `: ${this.props.section}` : ''}]`, error, errorInfo);
        }
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex flex-col items-center justify-center p-8 text-center"
                     style={{ minHeight: '200px' }}>
                    <div className="text-[var(--color-text-secondary)] mb-4">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
                             stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                    </div>
                    <p className="text-[var(--color-text)] text-sm font-medium mb-1">
                        {this.props.section ? `${this.props.section}에서 ` : ''}오류가 발생했습니다
                    </p>
                    <p className="text-[var(--color-text-muted)] text-xs mb-4">
                        잠시 후 다시 시도해주세요.
                    </p>
                    <button
                        onClick={this.handleRetry}
                        className="px-4 py-2 text-xs rounded bg-[var(--color-accent)] text-white hover:opacity-90 transition-opacity"
                    >
                        다시 시도
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
