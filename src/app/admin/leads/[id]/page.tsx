'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { LEAD_SOURCE_LABEL, LEAD_STATUS_LABEL, type Lead, type LeadStatus } from '@/types/lead';
import { counselorReportSchema, type CounselorReport } from '@/lib/report/prompt';

const STATUSES = Object.keys(LEAD_STATUS_LABEL) as LeadStatus[];
const card = 'rounded-[var(--radius-card)] border border-border bg-bg-elevated p-5';

/** 문자열이 JSON이면 파싱한 값을, 아니면 null을 반환한다 (손상된 데이터로 페이지가 죽지 않도록). */
function tryParseJSON<T>(text: string | null | undefined): T | null {
    if (!text) return null;
    try {
        return JSON.parse(text) as T;
    } catch {
        return null;
    }
}

export default function AdminLeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [lead, setLead] = useState<Lead | null>(null);
    const [report, setReport] = useState<CounselorReport | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch(`/api/admin/leads/${id}`).then(r => r.json()).then(d => {
            if (!d.success) return setError(d.error);
            setLead(d.lead);
            // 캐시된 리포트는 스키마까지 검증해 손상된 데이터로 화면이 깨지지 않게 한다
            const cachedReport = counselorReportSchema.safeParse(tryParseJSON<unknown>(d.lead.report));
            if (cachedReport.success) setReport(cachedReport.data);
        }).catch(() => setError('불러오지 못했습니다.'));
    }, [id]);

    async function generate(refresh: boolean) {
        setBusy(true);
        setError('');
        try {
            const d = await (await fetch(`/api/admin/leads/${id}/report${refresh ? '?refresh=1' : ''}`, { method: 'POST' })).json();
            if (!d.success) throw new Error(d.error);
            setReport(d.report);
        } catch (e) {
            setError(e instanceof Error ? e.message : '리포트 생성 실패');
        } finally {
            setBusy(false);
        }
    }

    async function changeStatus(status: LeadStatus) {
        const d = await (await fetch(`/api/admin/leads/${id}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
        })).json();
        if (d.success && lead) {
            setLead({ ...lead, status });
            setError('');
        }
        else setError(d.error || '상태 변경 실패');
    }

    if (error && !lead) return <p role="alert" className="text-danger">{error}</p>;
    if (!lead) return <p className="text-text-muted">불러오는 중...</p>;

    const payload = tryParseJSON<unknown>(lead.payload);

    return (
        <div className="space-y-4 max-w-3xl">
            <Link href="/admin/leads" className="text-sm text-text-secondary underline">← 목록</Link>
            <div className={card}>
                <h1 className="text-xl font-bold text-text">{lead.name} <span className="text-text-muted text-base font-normal">({LEAD_SOURCE_LABEL[lead.source]})</span></h1>
                <dl className="mt-3 grid grid-cols-[6rem_1fr] gap-y-1 text-sm">
                    <dt className="text-text-muted">연락처</dt><dd><a href={`tel:${lead.phone}`} className="text-accent">{lead.phone}</a></dd>
                    <dt className="text-text-muted">지역</dt><dd>{lead.region}</dd>
                    <dt className="text-text-muted">희망직무</dt><dd>{lead.desired_job || '-'}</dd>
                    <dt className="text-text-muted">신청일</dt><dd>{new Date(lead.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</dd>
                    <dt className="text-text-muted">동의 시각</dt><dd>{new Date(lead.consent_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</dd>
                </dl>
                <label className="mt-4 flex items-center gap-2 text-sm">
                    <span className="text-text-muted">상태</span>
                    <select value={lead.status} onChange={e => changeStatus(e.target.value as LeadStatus)}
                        className="h-9 px-2 rounded-[var(--radius-input)] border border-border bg-bg-elevated">
                        {STATUSES.map(s => <option key={s} value={s}>{LEAD_STATUS_LABEL[s]}</option>)}
                    </select>
                </label>
            </div>

            <div className={card}>
                <div className="flex items-center justify-between gap-2">
                    <h2 className="font-bold text-text">상담사 AI 리포트</h2>
                    <button onClick={() => generate(!!report)} disabled={busy}
                        className="h-9 px-3 rounded-[var(--radius-default)] bg-accent text-white text-sm font-semibold disabled:opacity-50">
                        {busy ? '생성 중...' : report ? '다시 생성' : '리포트 생성'}
                    </button>
                </div>
                {error && <p role="alert" className="mt-2 text-danger text-sm">{error}</p>}
                {report && (
                    <div className="mt-4 space-y-3 text-sm text-text">
                        <p><b>요약</b> {report.summary}</p>
                        <p><b>예상 유형</b> {report.expectedType}</p>
                        <p><b>직무·역량</b> {report.jobAndSkills}</p>
                        <div><b>상담 시 확인할 점</b><ul className="list-disc pl-5">{report.checkPoints.map(c => <li key={c}>{c}</li>)}</ul></div>
                        <div><b>제안 프로그램</b><ul className="list-disc pl-5">{report.programs.map(p => <li key={p}>{p}</li>)}</ul></div>
                    </div>
                )}
            </div>

            <details className={card}>
                <summary className="cursor-pointer font-bold text-text">수집 원본 데이터</summary>
                {payload !== null
                    ? <pre className="mt-3 text-xs whitespace-pre-wrap break-all text-text-secondary">{JSON.stringify(payload, null, 2)}</pre>
                    : <pre className="mt-3 text-xs whitespace-pre-wrap break-all text-text-secondary">{lead.payload}</pre>}
            </details>
        </div>
    );
}
