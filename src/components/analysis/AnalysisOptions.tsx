/** `AnalysisForm`의 "고급 옵션"(트렌드·경쟁사·강제 재생성) 체크 영역 — 400줄 제한 때문에 분리. */
interface AnalysisOptionsProps {
    includeTrends: boolean;
    onIncludeTrendsChange: (value: boolean) => void;
    includeCompetitors: boolean;
    onIncludeCompetitorsChange: (value: boolean) => void;
    allowForce?: boolean;
    force: boolean;
    onForceChange: (value: boolean) => void;
}

const checkboxRow = 'flex items-start gap-2 min-h-11';

export default function AnalysisOptions({
    includeTrends, onIncludeTrendsChange, includeCompetitors, onIncludeCompetitorsChange, allowForce, force, onForceChange,
}: AnalysisOptionsProps) {
    return (
        <div className="space-y-3">
            <span className="font-medium text-text">고급 옵션</span>
            <label className={checkboxRow}>
                <input type="checkbox" checked={includeTrends} onChange={e => onIncludeTrendsChange(e.target.checked)} className="mt-0.5 w-5 h-5" />
                <span>
                    <span className="block text-text">채용 시장 트렌드 반영</span>
                    <span className="block text-xs text-text-muted">고용24 채용공고 수치를 반영합니다</span>
                </span>
            </label>
            <label className={checkboxRow}>
                <input type="checkbox" checked={includeCompetitors} onChange={e => onIncludeCompetitorsChange(e.target.checked)} className="mt-0.5 w-5 h-5" />
                <span>
                    <span className="block text-text">경쟁사 데이터 포함</span>
                    <span className="block text-xs text-text-muted">Google 검색으로 최신 기업·시장 정보를 확인합니다</span>
                </span>
            </label>
            {allowForce && (
                <label className={checkboxRow}>
                    <input type="checkbox" checked={force} onChange={e => onForceChange(e.target.checked)} className="mt-0.5 w-5 h-5" />
                    <span className="text-text">캐시 무시하고 재생성</span>
                </label>
            )}
        </div>
    );
}
