/**
 * 분석 리포트 결과 렌더링 — 순수 컴포넌트(서버·클라이언트 공용, 상태 없음).
 * `/analysis/r/[publicId]`(참여자)와 `/admin/analysis/reports/[id]`(상담사, Task 8)에서 재사용한다.
 */
import type { ReactNode } from 'react';
import Link from 'next/link';
import AiGeneratedBadge from '@/components/AiGeneratedBadge';
import { dataBadgeLabels } from '@/lib/analysis/labels';
import {
    ANALYSIS_TYPE_LABEL,
    type IndustryReport, type JobReport, type PublicReport, type Work24Summary,
} from '@/lib/analysis/schema';

interface ReportViewProps {
    report: PublicReport;
    /** PDF 저장 버튼 href. 없으면 버튼을 숨긴다(Task 10에서 연결) */
    pdfHref?: string;
}

const DEMAND_LABEL = { high: '높음', medium: '보통', low: '낮음' } as const;
const card = 'rounded-[var(--radius-card)] border border-border bg-bg-elevated p-5';
const chip = 'h-9 inline-flex items-center px-3 rounded-full border border-border text-sm text-accent hover:bg-accent-soft';

function daysAgoLabel(createdAt: string): string {
    const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000);
    return days <= 0 ? '오늘 생성' : `${days}일 전 생성`;
}

/** 고용24가 반영되지 않았음을 중립적으로 알린다(구체적 사유는 밝히지 않음). */
function work24UnavailableReason(report: PublicReport): string | null {
    if (report.meta.dataUsed.includes('work24')) return null;
    return '이 리포트에는 고용24 채용 데이터가 반영되지 않았습니다.';
}

function Badge({ children }: { children: ReactNode }) {
    return <span className="inline-flex items-center h-6 px-2 rounded-full bg-accent-soft text-accent text-xs font-semibold">{children}</span>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className={`${card} space-y-3`}>
            <h2 className="font-bold text-text">{title}</h2>
            {children}
        </section>
    );
}

function Work24Table({ data }: { data: Work24Summary }) {
    return (
        <table className="w-full text-sm text-left">
            <caption className="sr-only">고용24 채용공고 수치</caption>
            <tbody>
                <tr className="border-b border-border">
                    <th scope="row" className="py-1.5 pr-3 font-medium text-text-secondary align-top w-24">공고 수</th>
                    <td className="py-1.5 text-text">{data.total.toLocaleString()}건</td>
                </tr>
                <tr className="border-b border-border">
                    <th scope="row" className="py-1.5 pr-3 font-medium text-text-secondary align-top">지역</th>
                    <td className="py-1.5 text-text">{data.topRegions.map(r => `${r.region} ${r.count}건`).join(', ') || '정보 없음'}</td>
                </tr>
                <tr>
                    <th scope="row" className="py-1.5 pr-3 font-medium text-text-secondary align-top">연봉 구간</th>
                    <td className="py-1.5 text-text">{data.salaryBands.map(b => `${b.band} ${b.count}건`).join(', ') || '정보 없음'}</td>
                </tr>
            </tbody>
        </table>
    );
}

interface HiringLike { summary: string; demandLevel: 'high' | 'medium' | 'low'; postingCount: number | null; topRegions: string[] }

function HiringSection({ hiring, work24, inDemandRoles }: { hiring: HiringLike; work24: Work24Summary | null; inDemandRoles?: string[] }) {
    return (
        <Section title={inDemandRoles ? '채용 트렌드' : '채용 동향'}>
            <p className="text-text-secondary leading-relaxed">{hiring.summary}</p>
            <dl className="grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-text-muted">수요</dt><dd className="font-semibold text-text">{DEMAND_LABEL[hiring.demandLevel]}</dd></div>
                <div><dt className="text-text-muted">공고 수</dt><dd className="font-semibold text-text">{hiring.postingCount !== null ? `${hiring.postingCount.toLocaleString()}건` : '정보 없음'}</dd></div>
            </dl>
            {hiring.topRegions.length > 0 && <p className="text-sm text-text-secondary">주요 지역: {hiring.topRegions.join(', ')}</p>}
            {inDemandRoles && inDemandRoles.length > 0 && <p className="text-sm text-text-secondary">수요 직무: {inDemandRoles.join(', ')}</p>}
            {work24 && <Work24Table data={work24} />}
        </Section>
    );
}

function JobSections({ content, work24 }: { content: JobReport; work24: Work24Summary | null }) {
    return (
        <>
            {content.aliases.length > 0 && <Section title="유사 직무명"><p className="text-text-secondary">{content.aliases.join(', ')}</p></Section>}
            <Section title="주요 업무">
                <ul className="list-disc pl-5 space-y-1 text-text-secondary">{content.mainTasks.map(t => <li key={t}>{t}</li>)}</ul>
            </Section>
            <Section title="필요 역량·자격">
                <p className="text-sm"><span className="font-semibold text-text">하드 스킬 </span><span className="text-text-secondary">{content.skills.hard.join(', ')}</span></p>
                <p className="text-sm"><span className="font-semibold text-text">소프트 스킬 </span><span className="text-text-secondary">{content.skills.soft.join(', ')}</span></p>
                {content.skills.certifications.length > 0 && (
                    <p className="text-sm"><span className="font-semibold text-text">자격증 </span><span className="text-text-secondary">{content.skills.certifications.join(', ')}</span></p>
                )}
            </Section>
            <HiringSection hiring={content.hiring} work24={work24} />
            <Section title="연봉 범위">
                <dl className="grid grid-cols-3 gap-3 text-sm">
                    <div><dt className="text-text-muted">신입</dt><dd className="font-semibold text-text">{content.salary.entry}</dd></div>
                    <div><dt className="text-text-muted">중간</dt><dd className="font-semibold text-text">{content.salary.mid}</dd></div>
                    <div><dt className="text-text-muted">시니어</dt><dd className="font-semibold text-text">{content.salary.senior}</dd></div>
                </dl>
                <p className="text-xs text-text-muted">{content.salary.basis}</p>
            </Section>
            <Section title="준비 로드맵">
                <ol className="space-y-3">
                    {content.roadmap.map(stage => (
                        <li key={stage.stage}>
                            <p className="font-semibold text-text">{stage.stage} <span className="font-normal text-text-muted">· {stage.period}</span></p>
                            <ul className="list-disc pl-5 text-text-secondary space-y-0.5">{stage.actions.map(a => <li key={a}>{a}</li>)}</ul>
                        </li>
                    ))}
                </ol>
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
        </>
    );
}

function IndustrySections({ content, work24 }: { content: IndustryReport; work24: Work24Summary | null }) {
    return (
        <>
            {content.segments.length > 0 && <Section title="세부 분야"><p className="text-text-secondary">{content.segments.join(', ')}</p></Section>}
            <Section title="시장 동향">
                <p className="text-text-secondary leading-relaxed">{content.market.summary}</p>
                <ul className="list-disc pl-5 space-y-1 text-text-secondary">{content.market.keyPoints.map(k => <li key={k}>{k}</li>)}</ul>
                <p className="text-sm text-text-secondary"><span className="font-semibold text-text">전망 </span>{content.market.outlook}</p>
            </Section>
            <Section title="주요 기업">
                <ul className="space-y-2">
                    {content.companies.map(c => (
                        <li key={c.name}>
                            <p className="font-semibold text-text">{c.name}{c.note && <span className="ml-2 text-xs font-normal text-text-muted">{c.note}</span>}</p>
                            <p className="text-sm text-text-secondary">{c.description}</p>
                        </li>
                    ))}
                </ul>
            </Section>
            <HiringSection hiring={content.hiring} work24={work24} inDemandRoles={content.hiring.inDemandRoles} />
            {content.promisingJobs.length > 0 && (
                <Section title="유망 직무">
                    <div className="space-y-2">
                        {content.promisingJobs.map(job => (
                            <div key={job.name} className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="font-semibold text-text">{job.name}</p>
                                    <p className="text-sm text-text-secondary">{job.reason}</p>
                                </div>
                                <Link href={`/analysis?type=job&keyword=${encodeURIComponent(job.name)}`} className={`${chip} shrink-0`}>분석하기</Link>
                            </div>
                        ))}
                    </div>
                </Section>
            )}
            {content.keywords.length > 0 && (
                <Section title="키워드">
                    <div className="flex flex-wrap gap-2">
                        {content.keywords.map(k => <span key={k} className="h-7 inline-flex items-center px-2.5 rounded-full bg-bg text-text-secondary text-xs">{k}</span>)}
                    </div>
                </Section>
            )}
        </>
    );
}

export default function ReportView({ report, pdfHref }: ReportViewProps) {
    const { content, meta } = report;
    const isJob = 'roadmap' in content;
    const work24Reason = work24UnavailableReason(report);

    return (
        <div className="space-y-4">
            <div className={`${card} space-y-3`}>
                <div className="flex flex-wrap items-center gap-2">
                    <Badge>{ANALYSIS_TYPE_LABEL[report.type]}</Badge>
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

            {isJob ? <JobSections content={content as JobReport} work24={meta.work24} /> : <IndustrySections content={content as IndustryReport} work24={meta.work24} />}

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
