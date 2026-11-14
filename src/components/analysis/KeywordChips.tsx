/**
 * 입력 중인 키워드 미리보기 칩 — `AnalysisForm`의 입력창 아래에 표시한다(순수 컴포넌트).
 * 키워드가 2개 이상일 때만 칩을 보여주고, 상한(`KEYWORDS_MAX`)을 넘으면 빨간 안내를 덧붙인다.
 */
import { KEYWORDS_MAX } from '@/lib/analysis/keywords';

interface KeywordChipsProps {
    keywords: string[];
}

export default function KeywordChips({ keywords }: KeywordChipsProps) {
    if (keywords.length < 2) return null;
    const over = keywords.length > KEYWORDS_MAX;

    return (
        <div className="mt-2 space-y-1">
            <div className="flex flex-wrap gap-2">
                {keywords.map((k, i) => (
                    <span key={`${k}-${i}`} className="h-8 inline-flex items-center px-3 rounded-full bg-accent-soft text-accent text-sm font-medium">
                        {k}
                    </span>
                ))}
            </div>
            {over && <p role="alert" className="text-danger text-xs">키워드는 최대 {KEYWORDS_MAX}개까지 비교할 수 있습니다.</p>}
        </div>
    );
}
