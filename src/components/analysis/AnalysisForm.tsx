'use client';

/**
 * 직무/산업 분석 요청 폼. 참여자 화면(`/analysis`)과 관리자 신규 분석(Task 4/8)에서 공용으로 쓴다.
 */
import { useState } from 'react';
import CrossBorderNotice from '@/components/privacy/CrossBorderNotice';
import {
    ANALYSIS_SCOPES, ANALYSIS_SCOPE_LABEL, ANALYSIS_TYPES, ANALYSIS_TYPE_LABEL, KEYWORD_MAX, KEYWORD_MIN,
    type AnalysisRequest, type PublicReport,
} from '@/lib/analysis/schema';

interface AnalysisFormProps {
    defaultType?: AnalysisRequest['type'];
    defaultKeyword?: string;
    endpoint?: string;
    /** true면 "캐시 무시하고 재생성" 체크를 노출한다(관리자 전용 화면에서만 true로 전달) */
    allowForce?: boolean;
    onCreated: (report: PublicReport, cached: boolean, adminId?: number) => void;
}

const field = 'w-full px-4 h-12 rounded-[var(--radius-input)] border border-border bg-bg-elevated text-text focus:outline-none focus:border-accent';
const checkboxRow = 'flex items-start gap-2 min-h-11';

export default function AnalysisForm({ defaultType = 'job', defaultKeyword = '', endpoint = '/api/analysis/reports', allowForce, onCreated }: AnalysisFormProps) {
    const [type, setType] = useState<AnalysisRequest['type']>(defaultType);
    const [keyword, setKeyword] = useState(defaultKeyword);
    const [scope, setScope] = useState<AnalysisRequest['scope']>('kr');
    const [includeTrends, setIncludeTrends] = useState(true);
    const [includeCompetitors, setIncludeCompetitors] = useState(true);
    const [force, setForce] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function submit() {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type, keyword: keyword.trim(), scope, includeCompetitors, includeTrends,
                    ...(allowForce && force ? { force: true } : {}),
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(typeof data?.error === 'string' ? data.error : '잠시 후 다시 시도해 주세요.');
                return;
            }
            onCreated(data.report as PublicReport, Boolean(data.cached), data.id);
        } catch {
            setError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="rounded-[var(--radius-card)] border border-border bg-bg-elevated p-5 space-y-5">
            <div role="radiogroup" aria-label="분석 유형" className="grid grid-cols-2 gap-2">
                {ANALYSIS_TYPES.map(t => (
                    <button key={t} type="button" role="radio" aria-checked={type === t} onClick={() => setType(t)}
                        className={`h-11 rounded-[var(--radius-default)] font-semibold ${
                            type === t ? 'bg-accent text-white' : 'bg-bg border border-border text-text-secondary'}`}>
                        {ANALYSIS_TYPE_LABEL[t]}
                    </button>
                ))}
            </div>

            <label className="block">
                <span className="font-medium text-text">키워드</span>
                <input value={keyword} onChange={e => setKeyword(e.target.value.slice(0, KEYWORD_MAX))}
                    maxLength={KEYWORD_MAX} placeholder="예: 핀테크 PM, AI 반도체" className={`${field} mt-1`} />
                <span className="text-xs text-text-muted">{keyword.length}/{KEYWORD_MAX}</span>
            </label>

            <label className="block">
                <span className="font-medium text-text">분석 범위</span>
                <select value={scope} onChange={e => setScope(e.target.value as AnalysisRequest['scope'])} className={`${field} mt-1`}>
                    {ANALYSIS_SCOPES.map(s => <option key={s} value={s}>{ANALYSIS_SCOPE_LABEL[s]}</option>)}
                </select>
            </label>

            <div className="space-y-3">
                <span className="font-medium text-text">고급 옵션</span>
                <label className={checkboxRow}>
                    <input type="checkbox" checked={includeTrends} onChange={e => setIncludeTrends(e.target.checked)} className="mt-0.5 w-5 h-5" />
                    <span>
                        <span className="block text-text">채용 시장 트렌드 반영</span>
                        <span className="block text-xs text-text-muted">고용24 채용공고 수치를 반영합니다</span>
                    </span>
                </label>
                <label className={checkboxRow}>
                    <input type="checkbox" checked={includeCompetitors} onChange={e => setIncludeCompetitors(e.target.checked)} className="mt-0.5 w-5 h-5" />
                    <span>
                        <span className="block text-text">경쟁사 데이터 포함</span>
                        <span className="block text-xs text-text-muted">Google 검색으로 최신 기업·시장 정보를 확인합니다</span>
                    </span>
                </label>
                {allowForce && (
                    <label className={checkboxRow}>
                        <input type="checkbox" checked={force} onChange={e => setForce(e.target.checked)} className="mt-0.5 w-5 h-5" />
                        <span className="text-text">캐시 무시하고 재생성</span>
                    </label>
                )}
            </div>

            <CrossBorderNotice />

            {error && <p role="alert" className="text-danger text-sm">{error}</p>}

            <button type="button" onClick={submit} disabled={loading || keyword.trim().length < KEYWORD_MIN}
                className="w-full h-12 rounded-[var(--radius-default)] bg-accent text-white font-bold hover:bg-accent-hover disabled:opacity-50">
                {loading ? '분석 중… 최대 30초' : 'J.AI 분석 실행하기'}
            </button>
        </div>
    );
}
