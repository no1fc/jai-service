'use client';

interface LoadingIndicatorProps {
    mode: 'bubble' | 'analyzing';
}

export default function LoadingIndicator({ mode }: LoadingIndicatorProps) {
    if (mode === 'bubble') {
        return (
            <div className="flex items-center gap-1.5 px-1 py-2 animate-fade-in" aria-live="polite" aria-busy="true">
                {[0, 1, 2].map((i) => (
                    <div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-text-muted"
                        style={{
                            animation: `pulse-soft 1.4s ease-in-out ${i * 0.2}s infinite`,
                        }}
                    />
                ))}
            </div>
        );
    }

    return (
        <div
            className="flex flex-col items-center justify-center gap-8 py-16 px-8 rounded-[4px] bg-bg-elevated border border-[var(--color-border)] mx-auto my-8 animate-reveal-up w-full max-w-lg"
            aria-live="assertive"
            aria-busy="true"
        >
            <div className="relative">
                <div className="w-16 h-16 rounded-full border-2 border-[var(--color-border)] flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-accent opacity-20 animate-pulse" />
                </div>
                <div className="absolute inset-0 border-2 border-t-accent border-transparent rounded-full animate-spin" />
            </div>

            <div className="text-center space-y-3">
                <h3 className="text-text font-bold text-xl tracking-tight">J.AI</h3>
                <p className="text-text-secondary text-sm font-medium">실시간 자격 분석 중입니다...</p>
            </div>

            <div className="w-full max-w-[240px] h-1 bg-bg rounded-[4px] overflow-hidden">
                <div className="h-full bg-accent animate-flow-gradient w-1/2 rounded-[4px]" />
            </div>

            <p className="text-text-muted text-[11px] text-center max-w-[240px] leading-relaxed font-sans">
                귀하의 응답과 최신 고용 지침을 대조하여 가장 정교한 결과를 도출하고 있습니다.
            </p>
        </div>
    );
}
