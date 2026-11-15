/**
 * `/career` 2단계: 문항 4개씩 한 페이지, 5점 척도 버튼. 공통 16문항(4페이지)·맞춤 4문항(1페이지) 공용.
 */
import type { CareerItem } from '@/lib/career/items';

interface ItemsStepProps {
    items: readonly CareerItem[];
    ratings: Record<string, number>;
    onRate: (id: string, value: number) => void;
    page: number;
    totalPages: number;
    title?: string;
    canProceed: boolean;
    onNext: () => void;
    onPrev: () => void;
    error?: string;
}

const SCALE = [1, 2, 3, 4, 5];
const box = 'rounded-[var(--radius-card)] border border-border bg-bg-elevated p-5';

export default function ItemsStep({ items, ratings, onRate, page, totalPages, title, canProceed, onNext, onPrev, error }: ItemsStepProps) {
    const isLast = page >= totalPages;
    return (
        <div className={`${box} space-y-5`}>
            <div className="flex items-center justify-between">
                <p className="text-text-secondary">{title ?? '각 문항에 얼마나 그런지 골라주세요. (1 전혀 아니다 ~ 5 매우 그렇다)'}</p>
                <span className="text-sm font-semibold text-text-muted shrink-0 ml-2">{page}/{totalPages}</span>
            </div>
            {items.map(item => (
                <fieldset key={item.id}>
                    <legend className="font-medium text-text mb-2">{item.text}</legend>
                    <div className="grid grid-cols-5 gap-2">
                        {SCALE.map(n => (
                            <button key={n} type="button" aria-pressed={ratings[item.id] === n}
                                onClick={() => onRate(item.id, n)}
                                className={`h-11 rounded-[var(--radius-default)] border font-semibold ${
                                    ratings[item.id] === n ? 'bg-accent text-white border-accent' : 'border-border text-text-secondary bg-bg-elevated'}`}>
                                {n}
                            </button>
                        ))}
                    </div>
                </fieldset>
            ))}
            {error && <p role="alert" className="text-danger text-sm">{error}</p>}
            <div className="flex gap-2">
                <button type="button" onClick={onPrev}
                    className="h-12 px-5 rounded-[var(--radius-default)] border border-border text-text-secondary">이전</button>
                <button type="button" disabled={!canProceed} onClick={onNext}
                    className="flex-1 h-12 rounded-[var(--radius-default)] bg-accent text-white font-bold hover:bg-accent-hover disabled:opacity-50">
                    {isLast ? '결과 받기' : '다음'}
                </button>
            </div>
        </div>
    );
}
