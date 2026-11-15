'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Copy } from 'lucide-react';
import LeadForm from '@/components/lead/LeadForm';
import AiGeneratedBadge from '@/components/AiGeneratedBadge';
import StarInput from '@/components/career/StarInput';
import ItemsStep from '@/components/career/ItemsStep';
import CompetencyDetail from '@/components/career/CompetencyDetail';
import { canProceedToItems, isStarComplete, useCareerFlow } from '@/components/career/use-career-flow';

type Tab = 'letter' | 'skills' | 'programs';
const TAB_LABEL: Record<Tab, string> = { letter: '자기소개서', skills: '역량 상세', programs: '추천 프로그램' };
const box = 'rounded-[var(--radius-card)] border border-border bg-bg-elevated p-5';

export default function CareerPage() {
    const flow = useCareerFlow();
    const [tab, setTab] = useState<Tab>('letter');
    const [copied, setCopied] = useState(false);
    const [copyError, setCopyError] = useState('');

    async function copyLetter() {
        if (!flow.result) return;
        try {
            await navigator.clipboard.writeText(flow.result.coverLetter);
            setCopied(true);
            setCopyError('');
        } catch {
            setCopied(false);
            setCopyError('복사에 실패했습니다. 직접 선택해 복사해 주세요.');
        }
    }

    const programs = flow.result
        ? Array.from(new Set([...flow.result.recommendedPrograms, ...flow.result.competencyDetails.flatMap(d => d.programs)]))
        : [];

    return (
        <div className="mx-auto max-w-2xl px-4 py-6 space-y-5">
            <div>
                <h1 className="text-xl font-bold text-text">AI 1분 자기소개서 · 역량 진단</h1>
                <p className="text-sm text-text-muted">입력 내용은 결과 생성에만 쓰이며, 상담 신청 시에만 저장됩니다.</p>
            </div>

            {flow.step === 'input' && (
                <StarInput
                    desiredJob={flow.desiredJob} onDesiredJobChange={flow.setDesiredJob}
                    experiences={flow.experiences} onExperienceChange={flow.setExperience}
                    onAddExperience={flow.addExperience} onRemoveExperience={flow.removeExperience}
                    strengthNote={flow.strengthNote} onStrengthNoteChange={flow.setStrengthNote}
                    canProceed={canProceedToItems(flow.desiredJob, flow.experiences)} onNext={flow.goToItems}
                />
            )}

            {(flow.step === 'items' || flow.step === 'jobItems') && (
                <ItemsStep
                    items={flow.pageItems} ratings={flow.itemRatings} onRate={flow.rateItem}
                    page={flow.progress.current} totalPages={flow.progress.total}
                    title={flow.step === 'jobItems' ? '희망 직무 맞춤 문항에도 답해 주세요.' : undefined}
                    canProceed={flow.canProceedPage} onNext={flow.nextPage} onPrev={flow.prevPage} error={flow.error}
                />
            )}

            {flow.step === 'waitingJobItems' && <p className={`${box} text-center text-text-secondary`} role="status">맞춤 문항을 준비하고 있어요...</p>}

            {flow.step === 'loading' && <p className={`${box} text-center text-text-secondary`} role="status">AI가 자기소개서와 역량을 분석하고 있어요...</p>}

            {flow.step === 'result' && flow.result && (
                <>
                    <Link href={`/analysis?type=job&keyword=${encodeURIComponent(flow.desiredJob)}`} className="text-sm text-accent underline">
                        &quot;{flow.desiredJob}&quot; 직무 분석 리포트 보기 →
                    </Link>
                    <div role="tablist" className="grid grid-cols-3 gap-2">
                        {(['letter', 'skills', 'programs'] as const).map(t => (
                            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
                                className={`h-11 rounded-[var(--radius-default)] text-sm font-semibold ${tab === t ? 'bg-accent text-white' : 'bg-bg-elevated border border-border text-text-secondary'}`}>
                                {TAB_LABEL[t]}
                            </button>
                        ))}
                    </div>

                    {tab === 'letter' && (
                        <div className={`${box} space-y-3`}>
                            <AiGeneratedBadge note="생성형 AI가 작성한 초안입니다. 사실과 다른 부분이 없는지 확인 후 수정해 사용하세요." />
                            <p className="whitespace-pre-line leading-relaxed text-text">{flow.result.coverLetter}</p>
                            <button onClick={copyLetter} className="h-11 px-4 inline-flex items-center gap-2 rounded-[var(--radius-default)] border border-border text-text-secondary">
                                <Copy size={16} aria-hidden /> {copied ? '복사됨' : '복사하기'}
                            </button>
                            {copyError && <p role="alert" className="text-danger text-sm">{copyError}</p>}
                            <p className="text-sm text-text-secondary border-t border-border pt-3"><b className="text-text">직무 적합도</b> {flow.result.jobFit}</p>
                        </div>
                    )}

                    {tab === 'skills' && (
                        <div className={`${box} space-y-4`}>
                            <AiGeneratedBadge />
                            {([['강점', flow.result.strengths], ['보완할 점', flow.result.gaps]] as const).map(([title, list]) => (
                                <div key={title}>
                                    <h2 className="font-bold text-text">{title}</h2>
                                    <ul className="mt-1 list-disc pl-5 text-text-secondary space-y-1">{list.map(i => <li key={i}>{i}</li>)}</ul>
                                </div>
                            ))}
                            <div className="space-y-3">
                                {flow.result.competencyDetails.map(d => <CompetencyDetail key={d.key} detail={d} />)}
                            </div>
                        </div>
                    )}

                    {tab === 'programs' && (
                        <div className={`${box} space-y-3`}>
                            <AiGeneratedBadge />
                            <h2 className="font-bold text-text">추천 국민취업지원제도 프로그램</h2>
                            {programs.length > 0 ? (
                                <ul className="flex flex-wrap gap-2" aria-label="추천 프로그램">
                                    {programs.map(p => <li key={p} className="h-8 inline-flex items-center px-3 rounded-full bg-accent-soft text-accent text-sm font-medium">{p}</li>)}
                                </ul>
                            ) : <p className="text-text-secondary text-sm">추천 프로그램이 없습니다.</p>}
                        </div>
                    )}

                    <LeadForm source="career" defaultDesiredJob={flow.desiredJob} payload={{
                        desiredJob: flow.desiredJob, experiences: flow.experiences.filter(isStarComplete), strengthNote: flow.strengthNote,
                        itemRatings: flow.itemRatings, competencyScores: flow.competencyScores, jobItems: flow.jobItems, result: flow.result,
                    }} />
                </>
            )}
        </div>
    );
}
