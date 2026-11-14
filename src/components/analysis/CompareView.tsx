/**
 * 비교 리포트(`kind==='compare'`) 결과 화면 — 설계서 5.6. `ReportView.tsx`와 헤더·출처·하단 액션
 * 레이아웃을 공유하고(같은 export된 스타일·헬퍼 재사용), 항목별 카드와 비교표만 비교 전용으로 구성한다.
 * 비교표는 md 이상에서 `<table>`(행=기준, 열=키워드), 그 아래 화면 너비에서는 기준별 `<dl>` 카드로 전환한다.
 */
import Link from 'next/link';
import AiGeneratedBadge from '@/components/AiGeneratedBadge';
import { Badge, card, chip, daysAgoLabel, Section, work24UnavailableReason } from './report-shared';
import { dataBadgeLabels } from '@/lib/analysis/labels';
import type { CompareReport, PublicReport } from '@/lib/analysis/schema';

interface CompareViewProps {
    report: PublicReport;
    /** PDF 저장 버튼 href. 없으면 버튼을 숨긴다. */
    pdfHref?: string;
}

const DEMAND_LABEL = { high: '높음', medium: '보통', low: '낮음' } as const;
/** 2~3개 항목 그리드 — Tailwind는 동적 문자열(`md:grid-cols-${n}`)을 인식하지 못해 고정 클래스로 분기한다. */
const ITEM_GRID = { 2: 'md:grid-cols-2', 3: 'md:grid-cols-3' } as const;

function ItemCard({ item }: { item: CompareReport['items'][number] }) {
    return (
        <div className={`${card} space-y-2`}>
            <h3 className="font-bold text-text">{item.keyword}</h3>
            <p className="text-sm text-text-secondary leading-relaxed">{item.overview}</p>
            <dl className="grid grid-cols-2 gap-2 text-sm">
                <div><dt className="text-text-muted">수요</dt><dd className="font-semibold text-text">{DEMAND_LABEL[item.demandLevel]}</dd></div>
                <div><dt className="text-text-muted">연봉(신입~중간)</dt><dd className="font-semibold text-text">{item.salary.entry} ~ {item.salary.mid}</dd></div>
            </dl>
            <p className="text-sm"><span className="font-semibold text-text">주요 업무 </span><span className="text-text-secondary">{item.mainTasks.join(', ')}</span></p>
            <p className="text-sm"><span className="font-semibold text-text">핵심 역량 </span><span className="text-text-secondary">{item.keySkills.join(', ')}</span></p>
            {item.pros.length > 0 && <p className="text-sm text-success">+ {item.pros.join(' · ')}</p>}
            {item.cons.length > 0 && <p className="text-sm text-danger">− {item.cons.join(' · ')}</p>}
        </div>
    );
}

function ComparisonTable({ items, criteria }: { items: CompareReport['items']; criteria: CompareReport['comparison']['criteria'] }) {
    return (
        <>
            <table className="hidden md:table w-full text-sm text-left">
                <caption className="sr-only">비교표</caption>
                <thead>
                    <tr className="border-b border-border">
                        <th scope="col" className="py-1.5 pr-3 font-medium text-text-secondary">기준</th>
                        {items.map(it => <th key={it.keyword} scope="col" className="py-1.5 pr-3 font-medium text-text">{it.keyword}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {criteria.map(c => (
                        <tr key={c.name} className="border-b border-border">
                            <th scope="row" className="py-1.5 pr-3 font-medium text-text-secondary align-top">{c.name}</th>
                            {c.values.map((v, i) => <td key={`${c.name}-${i}`} className="py-1.5 pr-3 text-text align-top">{v}</td>)}
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="md:hidden space-y-3">
                {criteria.map(c => (
                    <dl key={c.name} className="rounded-[var(--radius-default)] border border-border p-3 space-y-1">
                        <dt className="font-semibold text-text">{c.name}</dt>
                        {c.values.map((v, i) => (
                            <dd key={`${c.name}-${i}`} className="text-sm text-text-secondary">{items[i]?.keyword}: {v}</dd>
                        ))}
                    </dl>
                ))}
            </div>
        </>
    );
}

export default function CompareView({ report, pdfHref }: CompareViewProps) {
    const content = report.content as CompareReport;
    const { meta } = report;
    const work24Reason = work24UnavailableReason(report);
    const itemGridClass = ITEM_GRID[content.items.length as 2 | 3] ?? ITEM_GRID[2];

    return (
        <div className="space-y-4">
            <div className={`${card} space-y-3`}>
                <div className="flex flex-wrap items-center gap-2">
                    <Badge>비교</Badge>
                    {dataBadgeLabels(report).map(label => <Badge key={label}>{label}</Badge>)}
                    {work24Reason && <span className="text-xs text-text-muted">{work24Reason}</span>}
                </div>
                <h1 className="text-xl font-bold text-text">{content.title}</h1>
                <p className="text-text-secondary leading-relaxed">{content.summary}</p>
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <p className="text-xs text-text-muted">{daysAgoLabel(report.createdAt)}</p>
                    <AiGeneratedBadge />
                </div>
            </div>

            <div className={`grid grid-cols-1 ${itemGridClass} gap-4`}>
                {content.items.map(item => <ItemCard key={item.keyword} item={item} />)}
            </div>

            <Section title="비교표">
                <ComparisonTable items={content.items} criteria={content.comparison.criteria} />
            </Section>

            <Section title="추천">
                <p className="text-text-secondary leading-relaxed">{content.comparison.recommendation}</p>
                {content.comparison.fitBy.length > 0 && (
                    <ul className="space-y-1 text-sm">
                        {content.comparison.fitBy.map(f => (
                            <li key={f.profile}><span className="font-semibold text-text">{f.profile}</span> → <span className="text-accent">{f.keyword}</span> — <span className="text-text-secondary">{f.reason}</span></li>
                        ))}
                    </ul>
                )}
            </Section>

            {content.relatedJobs.length > 0 && (
                <Section title="관련 직무">
                    <div className="flex flex-wrap gap-2">
                        {content.relatedJobs.map(job => (
                            <Link key={job} href={`/analysis?type=job&keyword=${encodeURIComponent(job)}`} className={chip}>{job}</Link>
                        ))}
                    </div>
                </Section>
            )}

            {meta.sources.length > 0 && (
                <Section title="출처">
                    <ul className="space-y-1 text-sm">
                        {meta.sources.map((s, i) => (
                            <li key={`${s.uri}-${i}`}><a href={s.uri} target="_blank" rel="noopener noreferrer" className="text-accent underline break-all">{s.title}</a></li>
                        ))}
                    </ul>
                </Section>
            )}

            {meta.searchEntryPoint && (
                <div className={card}>
                    <p className="text-xs text-text-muted mb-2">Google 검색 제안</p>
                    {/* Google 제공 HTML은 본문 DOM에 직접 넣지 않고 sandbox iframe으로만 표시한다. */}
                    <iframe sandbox="" srcDoc={meta.searchEntryPoint} title="Google 검색 제안" className="w-full h-16 border-0" />
                </div>
            )}

            <p className="text-xs text-text-muted">AI가 생성한 참고 자료이며 실제 채용·연봉은 기업·시기에 따라 다릅니다.</p>

            <div className="flex flex-wrap gap-2">
                <Link href="/chat" className="h-11 inline-flex items-center px-4 rounded-[var(--radius-default)] bg-accent text-white font-semibold hover:bg-accent-hover">수급자격 모의진단</Link>
                <Link href="/analysis" className="h-11 inline-flex items-center px-4 rounded-[var(--radius-default)] border border-border text-text-secondary font-semibold hover:border-accent">다른 키워드 분석</Link>
                {pdfHref && <a href={pdfHref} className="h-11 inline-flex items-center px-4 rounded-[var(--radius-default)] border border-border text-text-secondary font-semibold hover:border-accent">PDF 저장</a>}
            </div>
        </div>
    );
}
