'use client';

/** 상담사용 리포트 보관함 — 유형 필터 + 키워드 검색(디바운스 300ms). `/admin/leads` 표 스타일을 따른다. */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ANALYSIS_SCOPE_LABEL, ANALYSIS_TYPE_LABEL, ANALYSIS_TYPES, type AnalysisRequest } from '@/lib/analysis/schema';

const SEARCH_DEBOUNCE_MS = 300;
type TypeFilter = AnalysisRequest['type'] | '';
const FILTERS: TypeFilter[] = ['', ...ANALYSIS_TYPES];

/** GET /api/admin/analysis/reports 응답 1건 — 설계서 7.2절 camelCase. */
interface AdminReportRow {
    id: number;
    publicId: string;
    type: AnalysisRequest['type'];
    keyword: string;
    scope: AnalysisRequest['scope'];
    createdAt: string;
    requestCount: number;
}

/** 입력값을 300ms 디바운스한 뒤 돌려준다(검색어 타이핑마다 요청을 보내지 않도록). */
function useDebouncedValue(value: string, delayMs: number): string {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delayMs);
        return () => clearTimeout(timer);
    }, [value, delayMs]);
    return debounced;
}

export default function AdminAnalysisReportsPage() {
    const [type, setType] = useState<TypeFilter>('');
    const [q, setQ] = useState('');
    const debouncedQ = useDebouncedValue(q, SEARCH_DEBOUNCE_MS);
    const [rows, setRows] = useState<AdminReportRow[] | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        const params = new URLSearchParams();
        if (type) params.set('type', type);
        if (debouncedQ) params.set('q', debouncedQ);
        fetch(`/api/admin/analysis/reports?${params.toString()}`)
            .then(r => r.json())
            .then(d => (d.success ? setRows(d.reports) : setError(d.error)))
            .catch(() => setError('목록을 불러오지 못했습니다.'));
    }, [type, debouncedQ]);

    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-bold text-[var(--color-text)]">분석 리포트 보관함</h1>

            <div className="flex flex-wrap items-center gap-3">
                <div className="flex gap-2 flex-wrap">
                    {FILTERS.map(f => (
                        <button key={f || 'all'} onClick={() => setType(f)}
                            className={`h-11 px-3 rounded-[4px] text-sm border ${type === f ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]' : 'border-[var(--color-border)] text-[var(--color-text-secondary)] bg-[var(--color-bg-elevated)]'}`}>
                            {f ? ANALYSIS_TYPE_LABEL[f] : '전체'}
                        </button>
                    ))}
                </div>
                <label className="flex-1 min-w-[12rem]">
                    <span className="sr-only">키워드 검색</span>
                    <input
                        value={q}
                        onChange={e => setQ(e.target.value.slice(0, 50))}
                        placeholder="키워드 검색"
                        className="w-full h-11 px-3 rounded-[4px] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[var(--color-text)]"
                    />
                </label>
            </div>

            {error && <p role="alert" className="text-[var(--color-danger)]">{error}</p>}
            {!rows && !error && <p className="text-[var(--color-text-muted)]">불러오는 중...</p>}
            {rows && rows.length === 0 && <p className="text-[var(--color-text-muted)]">조건에 맞는 리포트가 없습니다.</p>}

            {rows && rows.length > 0 && (
                <div className="overflow-x-auto rounded-[4px] border border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
                    <table className="w-full text-sm">
                        <thead className="bg-[var(--color-bg)] text-[var(--color-text-secondary)]">
                            <tr>{['생성일', '유형', '키워드', '범위', '요청 수', '보기'].map(h => <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>)}</tr>
                        </thead>
                        <tbody>
                            {rows.map(r => (
                                <tr key={r.id} className="border-t border-[var(--color-border)] hover:bg-[var(--color-bg)]">
                                    <td className="px-3 py-2 whitespace-nowrap">{new Date(r.createdAt).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })}</td>
                                    <td className="px-3 py-2">{ANALYSIS_TYPE_LABEL[r.type]}</td>
                                    <td className="px-3 py-2">{r.keyword}</td>
                                    <td className="px-3 py-2">{ANALYSIS_SCOPE_LABEL[r.scope]}</td>
                                    <td className="px-3 py-2">{r.requestCount}</td>
                                    <td className="px-3 py-2">
                                        <Link href={`/admin/analysis/reports/${r.id}`} className="text-[var(--color-accent)] font-semibold underline">보기</Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
