/**
 * 분석 리포트 PDF 레이아웃(react-pdf) — 섹션 순서는 설계서 5장 / `ReportView.tsx`와 동일하다.
 * PDF는 CSS 변수를 쓸 수 없어 `PDF_COLORS`만 색상 하드코딩을 허용한다.
 */
import type { ReactNode } from 'react';
import { Document, Link, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import {
    ANALYSIS_TYPE_LABEL,
    type IndustryReport, type JobReport, type PublicReport, type Work24Summary,
} from '../schema';

/** 디자인 토큰 값 — PDF 전용 하드코딩 허용 지점(위 주석 참고). */
const PDF_COLORS = {
    text: '#191f28',
    textSecondary: '#4e5968',
    accent: '#2563eb',
    border: '#e5e8eb',
} as const;

const DEMAND_LABEL = { high: '높음', medium: '보통', low: '낮음' } as const;
const SOURCES_MAX = 15;

const styles = StyleSheet.create({
    page: { padding: 40, fontFamily: 'NotoSansKR', fontSize: 10, color: PDF_COLORS.text },
    header: { marginBottom: 16, borderBottom: `1px solid ${PDF_COLORS.border}`, paddingBottom: 12 },
    brand: { fontSize: 10, color: PDF_COLORS.accent, fontWeight: 700, marginBottom: 6 },
    title: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
    meta: { fontSize: 9, color: PDF_COLORS.textSecondary },
    badgeRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
    badge: { fontSize: 8, color: PDF_COLORS.accent, backgroundColor: '#eef2ff', paddingVertical: 2, paddingHorizontal: 6, borderRadius: 8 },
    summary: { fontSize: 10, color: PDF_COLORS.textSecondary, marginBottom: 14, lineHeight: 1.5 },
    section: { marginBottom: 12 },
    sectionTitle: { fontSize: 12, fontWeight: 700, marginBottom: 6 },
    text: { fontSize: 10, color: PDF_COLORS.textSecondary, lineHeight: 1.5, marginBottom: 2 },
    listItem: { fontSize: 10, color: PDF_COLORS.textSecondary, marginBottom: 2 },
    roadmapStage: { marginBottom: 4 },
    table: { borderTop: `1px solid ${PDF_COLORS.border}`, marginTop: 4 },
    tableRow: { flexDirection: 'row', borderBottom: `1px solid ${PDF_COLORS.border}`, paddingVertical: 4 },
    tableLabel: { width: 90, fontSize: 9, color: PDF_COLORS.textSecondary },
    tableValue: { flex: 1, fontSize: 9 },
    sourceItem: { fontSize: 8, color: PDF_COLORS.accent, marginBottom: 2 },
    footer: {
        position: 'absolute', bottom: 24, left: 40, right: 40, textAlign: 'center',
        fontSize: 8, color: PDF_COLORS.textSecondary, borderTop: `1px solid ${PDF_COLORS.border}`, paddingTop: 6,
    },
});

/** meta.dataUsed에 따른 데이터 배지 라벨 — `ReportView.tsx`의 동명 함수와 동일 규칙. */
function dataBadgeLabels(report: PublicReport): string[] {
    const labels = report.meta.dataUsed.map(d => (d === 'work24' ? '고용24 반영' : '웹 검색 반영'));
    return labels.length > 0 ? labels : ['AI 지식 기반'];
}

function Header({ report }: { report: PublicReport }) {
    const createdDate = report.createdAt.slice(0, 10);
    return (
        <View style={styles.header}>
            <Text style={styles.brand}>잡모아 J.AI</Text>
            <Text style={styles.title}>{report.content.title}</Text>
            <Text style={styles.meta}>{ANALYSIS_TYPE_LABEL[report.type]} · {createdDate} 생성</Text>
            <View style={styles.badgeRow}>
                {dataBadgeLabels(report).map(label => <Text key={label} style={styles.badge}>{label}</Text>)}
            </View>
        </View>
    );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle} wrap={false}>{title}</Text>
            {children}
        </View>
    );
}

function Work24Table({ data }: { data: Work24Summary }) {
    const regions = data.topRegions.map(r => `${r.region} ${r.count}건`).join(', ') || '정보 없음';
    const bands = data.salaryBands.map(b => `${b.band} ${b.count}건`).join(', ') || '정보 없음';
    return (
        <View style={styles.table}>
            <View style={styles.tableRow}><Text style={styles.tableLabel}>공고 수</Text><Text style={styles.tableValue}>{data.total.toLocaleString()}건</Text></View>
            <View style={styles.tableRow}><Text style={styles.tableLabel}>지역</Text><Text style={styles.tableValue}>{regions}</Text></View>
            <View style={styles.tableRow}><Text style={styles.tableLabel}>연봉 구간</Text><Text style={styles.tableValue}>{bands}</Text></View>
        </View>
    );
}

interface HiringLike { summary: string; demandLevel: 'high' | 'medium' | 'low'; postingCount: number | null; topRegions: string[] }

function HiringBlock({ hiring, work24, inDemandRoles }: { hiring: HiringLike; work24: Work24Summary | null; inDemandRoles?: string[] }) {
    const postingLabel = hiring.postingCount !== null ? `${hiring.postingCount.toLocaleString()}건` : '정보 없음';
    return (
        <Section title={inDemandRoles ? '채용 트렌드' : '채용 동향'}>
            <Text style={styles.text}>{hiring.summary}</Text>
            <Text style={styles.text}>수요 {DEMAND_LABEL[hiring.demandLevel]} · 공고 수 {postingLabel}</Text>
            {hiring.topRegions.length > 0 && <Text style={styles.text}>주요 지역: {hiring.topRegions.join(', ')}</Text>}
            {inDemandRoles && inDemandRoles.length > 0 && <Text style={styles.text}>수요 직무: {inDemandRoles.join(', ')}</Text>}
            {work24 && <Work24Table data={work24} />}
        </Section>
    );
}

function JobBody({ content, work24 }: { content: JobReport; work24: Work24Summary | null }) {
    return (
        <>
            {content.aliases.length > 0 && (
                <Section title="유사 직무명"><Text style={styles.text}>{content.aliases.join(', ')}</Text></Section>
            )}
            <Section title="주요 업무">
                {content.mainTasks.map(t => <Text key={t} style={styles.listItem}>· {t}</Text>)}
            </Section>
            <Section title="필요 역량·자격">
                <Text style={styles.text}>하드 스킬 {content.skills.hard.join(', ')}</Text>
                <Text style={styles.text}>소프트 스킬 {content.skills.soft.join(', ')}</Text>
                {content.skills.certifications.length > 0 && <Text style={styles.text}>자격증 {content.skills.certifications.join(', ')}</Text>}
            </Section>
            <HiringBlock hiring={content.hiring} work24={work24} />
            <Section title="연봉 범위">
                <Text style={styles.text}>신입 {content.salary.entry} · 중간 {content.salary.mid} · 시니어 {content.salary.senior}</Text>
                <Text style={styles.text}>{content.salary.basis}</Text>
            </Section>
            <Section title="준비 로드맵">
                {content.roadmap.map(stage => (
                    <View key={stage.stage} style={styles.roadmapStage}>
                        <Text style={styles.text}>{stage.stage} · {stage.period}</Text>
                        {stage.actions.map(a => <Text key={a} style={styles.listItem}>- {a}</Text>)}
                    </View>
                ))}
            </Section>
            {content.relatedJobs.length > 0 && (
                <Section title="관련 직무"><Text style={styles.text}>{content.relatedJobs.join(', ')}</Text></Section>
            )}
        </>
    );
}

function IndustryBody({ content, work24 }: { content: IndustryReport; work24: Work24Summary | null }) {
    return (
        <>
            {content.segments.length > 0 && (
                <Section title="세부 분야"><Text style={styles.text}>{content.segments.join(', ')}</Text></Section>
            )}
            <Section title="시장 동향">
                <Text style={styles.text}>{content.market.summary}</Text>
                {content.market.keyPoints.map(k => <Text key={k} style={styles.listItem}>· {k}</Text>)}
                <Text style={styles.text}>전망 {content.market.outlook}</Text>
            </Section>
            <Section title="주요 기업">
                {content.companies.map(c => (
                    <Text key={c.name} style={styles.text}>{c.name}{c.note ? ` (${c.note})` : ''} — {c.description}</Text>
                ))}
            </Section>
            <HiringBlock hiring={content.hiring} work24={work24} inDemandRoles={content.hiring.inDemandRoles} />
            {content.promisingJobs.length > 0 && (
                <Section title="유망 직무">
                    {content.promisingJobs.map(job => <Text key={job.name} style={styles.text}>{job.name} — {job.reason}</Text>)}
                </Section>
            )}
            {content.keywords.length > 0 && (
                <Section title="키워드"><Text style={styles.text}>{content.keywords.join(', ')}</Text></Section>
            )}
        </>
    );
}

function SourcesList({ sources }: { sources: Array<{ title: string; uri: string }> }) {
    if (sources.length === 0) return null;
    return (
        <Section title="출처">
            {sources.slice(0, SOURCES_MAX).map(s => (
                <Link key={s.uri} src={s.uri} style={styles.sourceItem}>{s.title} ({s.uri})</Link>
            ))}
        </Section>
    );
}

function Footer() {
    return (
        <Text
            style={styles.footer}
            fixed
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages} · 생성형 AI가 작성한 참고 자료입니다 · 잡모아 J.AI`}
        />
    );
}

interface ReportPdfProps { report: PublicReport }

/** 리포트 1건을 A4 PDF 문서(Document)로 구성한다. */
export default function ReportPdf({ report }: ReportPdfProps) {
    const { content, meta } = report;
    const isJob = 'roadmap' in content;
    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <Header report={report} />
                <Text style={styles.summary}>{content.summary}</Text>
                {isJob
                    ? <JobBody content={content as JobReport} work24={meta.work24} />
                    : <IndustryBody content={content as IndustryReport} work24={meta.work24} />}
                <SourcesList sources={meta.sources} />
                <Footer />
            </Page>
        </Document>
    );
}
