'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { SIDO_LIST } from '@/lib/regions';
import type { LeadSource } from '@/types/lead';

interface LeadFormProps {
    source: LeadSource;
    payload: Record<string, unknown>;
    defaultDesiredJob?: string;
    defaultRegion?: string;
}

const inputClass = 'w-full h-12 px-4 rounded-[var(--radius-input)] border border-border bg-bg-elevated text-text placeholder:text-text-muted focus:outline-none focus:border-accent';

export default function LeadForm({ source, payload, defaultDesiredJob = '', defaultRegion = '' }: LeadFormProps) {
    const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
    const [error, setError] = useState('');

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        setState('sending');
        setError('');
        try {
            const res = await fetch('/api/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: form.get('name'),
                    phone: form.get('phone'),
                    region: form.get('region'),
                    desiredJob: form.get('desiredJob'),
                    consent: form.get('consent') === 'on',
                    source,
                    payload,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || '신청에 실패했습니다.');
            setState('done');
        } catch (err) {
            setError(err instanceof Error ? err.message : '신청에 실패했습니다.');
            setState('idle');
        }
    }

    if (state === 'done') {
        return (
            <div className="rounded-[var(--radius-card)] border border-border bg-bg-elevated p-6 text-center" role="status">
                <CheckCircle2 className="mx-auto mb-3 text-success" size={40} aria-hidden />
                <p className="font-bold text-text text-lg">상담 신청이 접수되었습니다</p>
                <p className="mt-1 text-text-secondary">담당 상담사가 영업일 기준 1~2일 안에 연락드립니다.</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="rounded-[var(--radius-card)] border border-border bg-bg-elevated p-5 md:p-6 space-y-4">
            <div>
                <h3 className="text-lg font-bold text-text">무료 1:1 상담 신청</h3>
                <p className="text-sm text-text-secondary mt-1">결과를 바탕으로 잡모아 상담사가 국민취업지원제도 신청을 도와드립니다.</p>
            </div>
            <label className="block">
                <span className="text-sm font-medium text-text">이름</span>
                <input name="name" required minLength={2} maxLength={50} autoComplete="name" className={`${inputClass} mt-1`} />
            </label>
            <label className="block">
                <span className="text-sm font-medium text-text">휴대폰 번호</span>
                <input name="phone" required type="tel" inputMode="tel" autoComplete="tel" placeholder="010-1234-5678" className={`${inputClass} mt-1`} />
            </label>
            <label className="block">
                <span className="text-sm font-medium text-text">거주 지역</span>
                <select name="region" required defaultValue={defaultRegion} className={`${inputClass} mt-1`}>
                    <option value="" disabled>시/도 선택</option>
                    {SIDO_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </label>
            <label className="block">
                <span className="text-sm font-medium text-text">희망 직무 <span className="text-text-muted">(선택)</span></span>
                <input name="desiredJob" maxLength={100} defaultValue={defaultDesiredJob} className={`${inputClass} mt-1`} />
            </label>
            <div className="rounded-[var(--radius-default)] bg-bg p-3 text-xs text-text-secondary leading-relaxed">
                <p><b>수집 항목</b>: 이름, 휴대폰 번호, 거주 지역, 희망 직무, 진단·상담 내용</p>
                <p><b>이용 목적</b>: 국민취업지원제도 상담 연락 및 안내</p>
                <p><b>보관 기간</b>: 신청일로부터 1년 후 파기</p>
                <p>AI 답변·분석 생성을 위해 진단 데이터가 Google(미국)로 국외 이전될 수 있습니다.</p>
                <p>동의를 거부할 수 있으며, 거부 시 상담 신청이 제한됩니다. <Link href="/privacy" className="underline">개인정보처리방침</Link></p>
            </div>
            <label className="flex items-start gap-2 min-h-[44px]">
                <input name="consent" type="checkbox" required className="mt-1 w-5 h-5 accent-[var(--color-accent)]" />
                <span className="text-sm text-text">[필수] 개인정보 수집·이용에 동의합니다.</span>
            </label>
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
            <button type="submit" disabled={state === 'sending'}
                className="w-full h-12 rounded-[var(--radius-default)] bg-accent text-white font-bold hover:bg-accent-hover disabled:opacity-60">
                {state === 'sending' ? '신청 중...' : '상담 신청하기'}
            </button>
        </form>
    );
}
