'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LEAD_SOURCE_LABEL, LEAD_STATUS_LABEL, type Lead, type LeadStatus } from '@/types/lead';

type Row = Omit<Lead, 'payload' | 'report'> & { hasReport: boolean };
const FILTERS: Array<LeadStatus | ''> = ['', 'new', 'contacted', 'enrolled', 'dropped'];

export default function AdminLeadsPage() {
    const [status, setStatus] = useState<LeadStatus | ''>('');

    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-bold text-text">상담 신청</h1>
            <div className="flex gap-2 flex-wrap">
                {FILTERS.map(s => (
                    <button key={s || 'all'} onClick={() => setStatus(s)}
                        className={`h-9 px-3 rounded-[var(--radius-default)] text-sm border ${status === s ? 'bg-accent text-white border-accent' : 'border-border text-text-secondary bg-bg-elevated'}`}>
                        {s ? LEAD_STATUS_LABEL[s] : '전체'}
                    </button>
                ))}
            </div>
            {/* status가 바뀌면 key로 새 인스턴스를 마운트해 rows를 자연스럽게 초기화한다 (effect 안에서 동기 setState 금지) */}
            <LeadsTable key={status} status={status} />
        </div>
    );
}

function LeadsTable({ status }: { status: LeadStatus | '' }) {
    const [rows, setRows] = useState<Row[] | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch(`/api/admin/leads${status ? `?status=${status}` : ''}`)
            .then(r => r.json())
            .then(d => (d.success ? setRows(d.leads) : setError(d.error)))
            .catch(() => setError('목록을 불러오지 못했습니다.'));
    }, [status]);

    return (
        <>
            {error && <p role="alert" className="text-danger">{error}</p>}
            {!rows && !error && <p className="text-text-muted">불러오는 중...</p>}
            {rows && rows.length === 0 && <p className="text-text-muted">신청 건이 없습니다.</p>}
            {rows && rows.length > 0 && (
                <div className="overflow-x-auto rounded-[var(--radius-card)] border border-border bg-bg-elevated">
                    <table className="w-full text-sm">
                        <thead className="bg-bg text-text-secondary">
                            <tr>{['신청일', '이름', '연락처', '지역', '희망직무', '경로', '상태', '리포트'].map(h => <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>)}</tr>
                        </thead>
                        <tbody>
                            {rows.map(r => (
                                <tr key={r.id} className="border-t border-border hover:bg-bg">
                                    <td className="px-3 py-2 whitespace-nowrap">{new Date(r.created_at).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })}</td>
                                    <td className="px-3 py-2"><Link href={`/admin/leads/${r.id}`} className="text-accent font-semibold underline">{r.name}</Link></td>
                                    <td className="px-3 py-2 whitespace-nowrap">{r.phone}</td>
                                    <td className="px-3 py-2">{r.region}</td>
                                    <td className="px-3 py-2">{r.desired_job || '-'}</td>
                                    <td className="px-3 py-2">{LEAD_SOURCE_LABEL[r.source]}</td>
                                    <td className="px-3 py-2">{LEAD_STATUS_LABEL[r.status]}</td>
                                    <td className="px-3 py-2">{r.hasReport ? '생성됨' : '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    );
}
