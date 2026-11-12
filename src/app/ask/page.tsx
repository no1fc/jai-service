'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Send } from 'lucide-react';
import LeadForm from '@/components/lead/LeadForm';
import CrossBorderNotice from '@/components/privacy/CrossBorderNotice';
import { MAX_HISTORY_MESSAGES } from '@/lib/qna/prompt';

type Msg = { role: 'user' | 'model'; text: string; suggestDiagnosis?: boolean; isError?: boolean };

const GREETING: Msg = { role: 'model', text: '안녕하세요! 국민취업지원제도에 대해 궁금한 점을 도와드리는 J.AI 상담봇입니다. 무엇이든 물어보세요.' };
const EXAMPLES = ['대학생도 신청 가능한가요?', '구직촉진수당은 얼마나 받나요?', '알바 중인데 신청할 수 있나요?', '신청은 어디서 하나요?'];

export default function AskPage() {
    const [messages, setMessages] = useState<Msg[]>([GREETING]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [showLead, setShowLead] = useState(false);
    const endRef = useRef<HTMLDivElement>(null);
    // 연속 클릭(예시 칩 더블클릭 등)으로 ask()가 중복 실행되는 것을 막는 즉시 체크용 플래그
    const inFlightRef = useRef(false);

    useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading, showLead]);

    async function ask(text: string) {
        const q = text.trim();
        if (!q || loading || inFlightRef.current) return;
        inFlightRef.current = true;
        const next: Msg[] = [...messages, { role: 'user', text: q }];
        setMessages(next);
        setInput('');
        setLoading(true);
        try {
            // 초기 인사말과 오류 말풍선은 대화 이력에서 제외하고, 최근 N개만 서버로 전송한다
            const history = next.filter(m => m !== GREETING && !m.isError).slice(-MAX_HISTORY_MESSAGES);
            const res = await fetch('/api/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: history.map(({ role, text: msgText }) => ({ role, text: msgText })) }),
            });
            const data = await res.json();
            setMessages([...next, res.ok
                ? { role: 'model', text: data.answer, suggestDiagnosis: data.suggestDiagnosis }
                : { role: 'model', text: data.error || '잠시 후 다시 시도해 주세요.', isError: true }]);
        } catch {
            setMessages([...next, { role: 'model', text: '연결에 실패했습니다. 잠시 후 다시 시도해 주세요.', isError: true }]);
        } finally {
            setLoading(false);
            inFlightRef.current = false;
        }
    }

    const onSubmit = (e: FormEvent) => { e.preventDefault(); ask(input); };
    const userQuestions = messages.filter(m => m.role === 'user').map(m => m.text);

    return (
        <div className="mx-auto max-w-2xl px-4 py-6 flex flex-col min-h-[calc(100dvh-56px)]">
            <h1 className="text-xl font-bold text-text">국취 24시 Q&A</h1>
            <p className="text-sm text-text-muted">AI 답변은 참고용입니다. 정확한 내용은 고용센터 심사 기준을 따릅니다.</p>

            <div className="flex-1 mt-4 space-y-3" aria-live="polite">
                {messages.map((m, i) => (
                    <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex flex-col items-start'}>
                        <p className={`max-w-[85%] whitespace-pre-line rounded-[var(--radius-card)] px-4 py-3 leading-relaxed ${
                            m.role === 'user' ? 'bg-accent text-white' : 'bg-bg-elevated border border-border text-text'}`}>
                            {m.text}
                        </p>
                        {m.suggestDiagnosis && (
                            <Link href="/chat" className="mt-2 h-11 px-4 inline-flex items-center rounded-[var(--radius-default)] border border-accent text-accent font-semibold bg-bg-elevated">
                                수급자격 모의진단 바로가기
                            </Link>
                        )}
                    </div>
                ))}
                {loading && <p className="text-text-muted text-sm">답변을 준비하고 있어요...</p>}
                {messages.length === 1 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                        {EXAMPLES.map(q => (
                            <button key={q} onClick={() => ask(q)} disabled={loading} className="min-h-[44px] px-3 rounded-full border border-border bg-bg-elevated text-sm text-text-secondary hover:border-accent hover:text-accent disabled:opacity-50">
                                {q}
                            </button>
                        ))}
                    </div>
                )}
                {userQuestions.length > 0 && !showLead && (
                    <button onClick={() => setShowLead(true)} className="text-accent font-semibold underline underline-offset-4 min-h-[44px]">
                        상담사와 직접 이야기하고 싶어요
                    </button>
                )}
                {showLead && <LeadForm source="qna" payload={{ questions: userQuestions }} />}
                <div ref={endRef} />
            </div>

            <div className="pt-2"><CrossBorderNotice /></div>
            <form onSubmit={onSubmit} className="sticky bottom-0 bg-bg pt-2 pb-4 flex gap-2">
                <label htmlFor="ask-input" className="sr-only">질문 입력</label>
                <input id="ask-input" value={input} onChange={e => setInput(e.target.value.slice(0, 500))}
                    placeholder="궁금한 점을 입력하세요" disabled={loading}
                    className="flex-1 h-12 px-4 rounded-[var(--radius-input)] border border-border bg-bg-elevated text-text focus:outline-none focus:border-accent" />
                <button type="submit" disabled={loading || !input.trim()} aria-label="질문 보내기"
                    className="w-12 h-12 rounded-[var(--radius-default)] bg-accent text-white flex items-center justify-center disabled:opacity-50">
                    <Send size={18} aria-hidden />
                </button>
            </form>
        </div>
    );
}
