/**
 * `/career` 결과: 역량 1개 카드 — 수준 배지·점수 막대·해설·근거·보완 방법·추천 프로그램.
 */
import { COMPETENCIES, type CompetencyDetail as CompetencyDetailType } from '@/lib/career/schema';

const LEVEL_STYLE: Record<CompetencyDetailType['level'], string> = {
    상: 'bg-success/10 text-success',
    중: 'bg-warning/10 text-warning',
    하: 'bg-danger/10 text-danger',
};

export default function CompetencyDetail({ detail }: { detail: CompetencyDetailType }) {
    const label = COMPETENCIES.find(c => c.key === detail.key)?.label ?? detail.key;
    return (
        <div className="rounded-[var(--radius-card)] border border-border bg-bg-elevated p-4 space-y-2">
            <div className="flex items-center justify-between">
                <h3 className="font-bold text-text">{label}</h3>
                <span className={`inline-flex h-6 items-center px-2 rounded-full text-xs font-semibold ${LEVEL_STYLE[detail.level]}`}>{detail.level}</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="h-2.5 flex-1 rounded-full bg-bg overflow-hidden">
                    <span className="block h-full bg-accent rounded-full" style={{ width: `${(detail.score / 5) * 100}%` }} />
                </span>
                <span className="text-sm font-semibold text-text w-8 text-right">{detail.score.toFixed(1)}</span>
            </div>
            <p className="text-sm text-text-secondary">{detail.explanation}</p>
            <p className="text-sm text-text-muted"><b className="text-text-secondary">근거</b> {detail.evidence}</p>
            <p className="text-sm text-text-muted"><b className="text-text-secondary">보완 방법</b> {detail.improvement}</p>
            {detail.programs.length > 0 && (
                <ul className="flex flex-wrap gap-1.5" aria-label="추천 프로그램">
                    {detail.programs.map(p => (
                        <li key={p} className="h-7 inline-flex items-center px-2.5 rounded-full bg-accent-soft text-accent text-xs font-medium">{p}</li>
                    ))}
                </ul>
            )}
        </div>
    );
}
