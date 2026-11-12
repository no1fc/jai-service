'use client';

import { useRef, useState } from 'react';
import { Copy } from 'lucide-react';
import LeadForm from '@/components/lead/LeadForm';
import { COMPETENCIES, type CareerResult, type CompetencyKey } from '@/lib/career/schema';

type Step = 'input' | 'rating' | 'loading' | 'result';
const SCALE = [1, 2, 3, 4, 5];
const box = 'rounded-[var(--radius-card)] border border-border bg-bg-elevated p-5';
const field = 'w-full px-4 rounded-[var(--radius-input)] border border-border bg-bg-elevated text-text focus:outline-none focus:border-accent';
const primary = 'w-full h-12 rounded-[var(--radius-default)] bg-accent text-white font-bold hover:bg-accent-hover disabled:opacity-50';

export default function CareerPage() {
    const [step, setStep] = useState<Step>('input');
    const [desiredJob, setDesiredJob] = useState('');
    const [experience, setExperience] = useState('');
    const [ratings, setRatings] = useState<Partial<Record<CompetencyKey, number>>>({});
    const [result, setResult] = useState<CareerResult | null>(null);
    const [tab, setTab] = useState<'letter' | 'skills'>('letter');
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
    // 버튼 연속 클릭 등으로 submit()이 중복 실행되는 것을 막는 즉시 체크용 플래그
    const inFlightRef = useRef(false);

    const allRated = COMPETENCIES.every(c => ratings[c.key]);

    async function submit() {
        if (inFlightRef.current) return;
        inFlightRef.current = true;
        setStep('loading');
        setError('');
        try {
            const res = await fetch('/api/career', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ desiredJob, experience, ratings }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setResult(data.result);
            setStep('result');
        } catch (err) {
            setError(err instanceof Error && err.message ? err.message : '잠시 후 다시 시도해 주세요.');
            setStep('rating');
        } finally {
            inFlightRef.current = false;
        }
    }

    async function copyLetter() {
        if (!result) return;
        try {
            await navigator.clipboard.writeText(result.coverLetter);
            setCopied(true);
        } catch {
            setCopied(false);
            setError('복사에 실패했습니다. 직접 선택해 복사해 주세요.');
        }
    }

    return (
        <div className="mx-auto max-w-2xl px-4 py-6 space-y-5">
            <div>
                <h1 className="text-xl font-bold text-text">AI 1분 자기소개서 · 역량 진단</h1>
                <p className="text-sm text-text-muted">입력 내용은 결과 생성에만 쓰이며, 상담 신청 시에만 저장됩니다.</p>
            </div>

            {step === 'input' && (
                <div className={`${box} space-y-4`}>
                    <label className="block">
                        <span className="font-medium text-text">희망 직무</span>
                        <input value={desiredJob} onChange={e => setDesiredJob(e.target.value.slice(0, 100))}
                            placeholder="예: 사무 행정, 웹 개발, 물류 관리" className={`${field} h-12 mt-1`} />
                    </label>
                    <label className="block">
                        <span className="font-medium text-text">경험·강점 (3줄 정도)</span>
                        <textarea value={experience} onChange={e => setExperience(e.target.value.slice(0, 600))} rows={4}
                            placeholder="예: 카페 아르바이트 2년, 엑셀 자격증, 고객 응대에 자신 있음" className={`${field} py-3 mt-1`} />
                        <span className="text-xs text-text-muted">{experience.length}/600</span>
                    </label>
                    <button className={primary} disabled={!desiredJob.trim() || experience.trim().length < 10} onClick={() => setStep('rating')}>
                        다음: 역량 체크
                    </button>
                </div>
            )}

            {step === 'rating' && (
                <div className={`${box} space-y-5`}>
                    <p className="text-text-secondary">각 역량을 스스로 평가해 주세요. (1 부족 ~ 5 매우 자신 있음)</p>
                    {COMPETENCIES.map(c => (
                        <fieldset key={c.key}>
                            <legend className="font-medium text-text mb-2">{c.label}</legend>
                            <div className="grid grid-cols-5 gap-2">
                                {SCALE.map(n => (
                                    <button key={n} type="button" aria-pressed={ratings[c.key] === n}
                                        onClick={() => setRatings(r => ({ ...r, [c.key]: n }))}
                                        className={`h-11 rounded-[var(--radius-default)] border font-semibold ${
                                            ratings[c.key] === n ? 'bg-accent text-white border-accent' : 'border-border text-text-secondary bg-bg-elevated'}`}>
                                        {n}
                                    </button>
                                ))}
                            </div>
                        </fieldset>
                    ))}
                    {error && <p role="alert" className="text-danger text-sm">{error}</p>}
                    <div className="flex gap-2">
                        <button className="h-12 px-5 rounded-[var(--radius-default)] border border-border text-text-secondary" onClick={() => setStep('input')}>이전</button>
                        <button className={primary} disabled={!allRated} onClick={submit}>결과 받기</button>
                    </div>
                </div>
            )}

            {step === 'loading' && <p className={`${box} text-center text-text-secondary`} role="status">AI가 자기소개서와 역량을 분석하고 있어요...</p>}

            {step === 'result' && result && (
                <>
                    <div role="tablist" className="grid grid-cols-2 gap-2">
                        {(['letter', 'skills'] as const).map(t => (
                            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
                                className={`h-11 rounded-[var(--radius-default)] font-semibold ${tab === t ? 'bg-accent text-white' : 'bg-bg-elevated border border-border text-text-secondary'}`}>
                                {t === 'letter' ? '자기소개서 초안' : '역량 진단'}
                            </button>
                        ))}
                    </div>

                    {tab === 'letter' ? (
                        <div className={`${box} space-y-3`}>
                            <p className="whitespace-pre-line leading-relaxed text-text">{result.coverLetter}</p>
                            <button onClick={copyLetter} className="h-11 px-4 inline-flex items-center gap-2 rounded-[var(--radius-default)] border border-border text-text-secondary">
                                <Copy size={16} aria-hidden /> {copied ? '복사됨' : '복사하기'}
                            </button>
                            {error && <p role="alert" className="text-danger text-sm">{error}</p>}
                        </div>
                    ) : (
                        <div className={`${box} space-y-5`}>
                            <ul className="space-y-2" aria-label="역량 점수">
                                {COMPETENCIES.map(c => (
                                    <li key={c.key} className="grid grid-cols-[7rem_1fr_2rem] items-center gap-2 text-sm">
                                        <span className="text-text-secondary">{c.label}</span>
                                        <span className="h-2.5 rounded-full bg-bg overflow-hidden">
                                            <span className="block h-full bg-accent rounded-full" style={{ width: `${(ratings[c.key] ?? 0) * 20}%` }} />
                                        </span>
                                        <span className="text-text font-semibold text-right">{ratings[c.key]}</span>
                                    </li>
                                ))}
                            </ul>
                            {([['강점', result.strengths], ['보완할 점', result.gaps], ['추천 국취 프로그램', result.recommendedPrograms]] as const).map(([title, items]) => (
                                <div key={title}>
                                    <h2 className="font-bold text-text">{title}</h2>
                                    <ul className="mt-1 list-disc pl-5 text-text-secondary space-y-1">
                                        {items.map(i => <li key={i}>{i}</li>)}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    )}

                    <LeadForm source="career" defaultDesiredJob={desiredJob}
                        payload={{ desiredJob, experience, ratings, result }} />
                </>
            )}
        </div>
    );
}
