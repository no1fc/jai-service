'use client';

import { CheckCircle2, AlertTriangle, XCircle, Trophy, Lightbulb, MapPin } from 'lucide-react';
import { DiagnosisResult } from '@/hooks/useChat';

const TYPE_CONFIG = {
    '1유형_요건심사형': {
        icon: CheckCircle2,
        iconColor: 'var(--color-success)',
        borderColor: 'color-mix(in srgb, var(--color-success) 25%, transparent)',
        label: '1유형 (요건심사형)',
        emoji: '🎉',
    },
    '1유형_선발형': {
        icon: Trophy,
        iconColor: 'var(--color-accent)',
        borderColor: 'color-mix(in srgb, var(--color-accent) 25%, transparent)',
        label: '1유형 (선발형)',
        emoji: '🏆',
    },
    '2유형': {
        icon: AlertTriangle,
        iconColor: 'var(--color-warning)',
        borderColor: 'color-mix(in srgb, var(--color-warning) 25%, transparent)',
        label: '2유형 (일반형)',
        emoji: '📋',
    },
    '제한': {
        icon: XCircle,
        iconColor: 'var(--color-danger)',
        borderColor: 'color-mix(in srgb, var(--color-danger) 25%, transparent)',
        label: '참여 제한',
        emoji: '⚠️',
    },
};

export default function ResultCard({ result }: { result: DiagnosisResult }) {
    const config = TYPE_CONFIG[result.type] ?? TYPE_CONFIG['2유형'];
    const IconComponent = config.icon;
    const isRestricted = result.type === '제한';

    return (
        <div className="w-full h-full animate-reveal-up flex flex-col">
            <div
                className="bg-bg-elevated rounded-[var(--radius-card)] p-5 md:p-6 border overflow-hidden relative flex flex-col h-full"
                style={{ borderColor: config.borderColor }}
            >
                <div className="flex flex-col items-center text-center mb-4 relative z-10 shrink-0">
                    <div className="w-14 h-14 rounded-[var(--radius-card)] bg-bg flex items-center justify-center mb-4 border border-border">
                        <IconComponent size={28} color={config.iconColor} />
                    </div>
                    <p className="text-accent text-[10px] font-black uppercase tracking-[0.3em] mb-2">Diagnosis Result</p>
                    <h2 className="text-text text-2xl md:text-3xl font-black tracking-tighter mb-1">{config.label}</h2>
                    {result.subType && <p className="text-text-muted text-xs md:text-sm font-medium">{result.subType}</p>}
                </div>

                {result.score !== null && result.score !== undefined && (
                    <div className="bg-bg rounded-[var(--radius-card)] p-5 mb-5 border border-border relative z-10 shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="text-left">
                                <p className="text-text-muted text-[10px] font-black uppercase tracking-widest mb-1">Eligibility Score</p>
                                <p className="text-text text-sm font-bold">종합 판정 점수</p>
                            </div>
                            <div className="text-right">
                                <span className="text-4xl font-black text-accent tracking-tighter">{result.score}</span>
                                <span className="text-text-muted text-xl font-bold ml-1">/100</span>
                            </div>
                        </div>

                        {result.scoreDetails && result.scoreDetails.length > 0 && (
                            <div className="mt-5 pt-4 border-t border-border space-y-2.5">
                                {result.scoreDetails.map((detail, idx) => (
                                    <div key={idx} className="flex items-start gap-3 text-xs text-text-muted leading-relaxed group">
                                        <div className="w-1.5 h-1.5 rounded-full bg-accent/30 mt-1" />
                                        <span className="group-hover:text-text-secondary transition-colors">{detail}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* 컨텐츠 (스크롤 여유 공간) */}
                <div className="flex-1 flex flex-col justify-center mb-4 relative z-10 shrink-0">
                    <div className="relative py-4 px-5 border border-accent/30 rounded-[var(--radius-card)] bg-accent/5">

                        <p className="text-text text-sm leading-relaxed font-medium text-justify relative z-10">
                            {result.description.split('\n').map((line, i) => (
                                <span key={i}>{line}<br /></span>
                            ))}
                        </p>
                    </div>
                </div>

                {isRestricted && result.restrictReason && (
                    <div className="mb-4 p-4 md:p-5 rounded-[var(--radius-card)] bg-danger/5 border border-danger/20 relative z-10 shrink-0">
                        <p className="text-danger text-[10px] font-black uppercase tracking-widest mb-2">Restriction Reason</p>
                        <p className="text-danger/80 text-sm font-bold leading-relaxed">{result.restrictReason}</p>
                    </div>
                )}

                {result.tips && result.tips.length > 0 && (
                    <div className="mb-4 space-y-2.5 relative z-10 shrink-0">
                        <div className="flex items-center gap-2 ml-1">
                            <Lightbulb size={14} className="text-warning" />
                            <span className="text-text-muted text-[10px] font-black uppercase tracking-[0.2em]">AI Mentor's Advice</span>
                        </div>
                        {result.tips.map((tip, idx) => (
                            <div key={idx} className="p-4 rounded-[var(--radius-card)] bg-bg border border-border text-xs md:text-sm text-text-secondary font-medium leading-relaxed hover:bg-bg-elevated transition-colors">
                                {tip}
                            </div>
                        ))}
                    </div>
                )}

                <div className="space-y-2.5 relative z-10 mt-auto pt-2 shrink-0">
                    {isRestricted && (
                        <a
                            href="https://www.work24.go.kr"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full h-12 md:h-14 rounded-[var(--radius-default)] bg-bg border border-border text-text font-black text-xs md:text-sm flex items-center justify-center gap-3 transition-all hover:bg-bg-elevated"
                        >
                            고용24 공식 사이트 방문
                        </a>
                    )}
                    <p className="text-center text-[10px] text-text-muted mt-2 leading-relaxed font-sans">
                        본 결과는 단순 참고용이며, 정확한 수급 자격은 관할 고용센터의 공식 심사를 통해 결정됩니다.
                    </p>
                </div>
            </div>
        </div>
    );
}
