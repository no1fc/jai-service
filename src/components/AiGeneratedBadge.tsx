import { Sparkles } from 'lucide-react';

interface AiGeneratedBadgeProps {
    /** 배지 아래/옆에 덧붙일 보조 설명(선택) */
    note?: string;
}

/**
 * 생성형 AI가 작성한 내용임을 알리는 공용 배지 — 인공지능기본법 제31조 제2항.
 */
export default function AiGeneratedBadge({ note }: AiGeneratedBadgeProps) {
    return (
        <div className="flex flex-col gap-1">
            <span
                className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-accent-soft text-accent text-xs font-semibold w-fit"
                aria-label="생성형 AI가 작성한 내용"
            >
                <Sparkles size={12} aria-hidden />
                AI 생성
            </span>
            {note && <p className="text-xs text-text-muted">{note}</p>}
        </div>
    );
}
