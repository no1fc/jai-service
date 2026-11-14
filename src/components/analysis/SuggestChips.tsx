/**
 * 입력 중 유사 직무 추천 칩 — 클릭하면 폼이 마지막 토큰을 치환한다(순수 컴포넌트, 설계서 6장 B-3).
 */
interface SuggestChipsProps {
    suggestions: string[];
    onPick: (value: string) => void;
}

export default function SuggestChips({ suggestions, onPick }: SuggestChipsProps) {
    if (suggestions.length === 0) return null;

    return (
        <div role="group" aria-label="유사 직무 추천" className="mt-2 flex flex-wrap gap-2">
            {suggestions.map(s => (
                <button key={s} type="button" onClick={() => onPick(s)} aria-label={`추천: ${s}`}
                    className="h-11 px-4 inline-flex items-center rounded-full border border-border bg-bg text-text-secondary text-sm font-medium hover:bg-accent-soft hover:text-accent hover:border-accent">
                    {s}
                </button>
            ))}
        </div>
    );
}
