import Link from 'next/link';
import { MessageCircleQuestion, ClipboardCheck, FileText, ArrowRight } from 'lucide-react';

const SERVICES = [
    {
        href: '/ask', icon: MessageCircleQuestion, title: '국취 24시 Q&A',
        desc: '"대학생도 신청할 수 있나요?" 국민취업지원제도, 궁금한 건 언제든 바로 물어보세요.',
        cta: '질문하기',
    },
    {
        href: '/chat', icon: ClipboardCheck, title: '수급자격 모의진단',
        desc: '12개 질문으로 내 유형과 받을 수 있는 수당을 3분 만에 확인하세요.',
        cta: '진단 시작',
    },
    {
        href: '/career', icon: FileText, title: 'AI 1분 자기소개서·역량 진단',
        desc: '희망 직무와 경험 몇 줄이면 자기소개서 초안과 역량 분석을 받아볼 수 있어요.',
        cta: '무료로 받기',
    },
];

const STEPS = [
    { n: '1', title: 'AI로 확인', desc: 'Q&A·모의진단·자소서로 내 상황을 먼저 확인' },
    { n: '2', title: '상담 신청', desc: '결과 화면에서 바로 무료 상담 신청' },
    { n: '3', title: '맞춤 상담', desc: '상담사가 결과를 보고 미리 준비해서 연락' },
    { n: '4', title: '제도 참여', desc: '국민취업지원제도 신청부터 취업까지 동행' },
];

export default function LandingPage() {
    return (
        <div className="bg-bg">
            <section className="mx-auto max-w-5xl px-4 pt-12 pb-10 md:pt-20 md:pb-16">
                <p className="inline-block rounded-full bg-accent-soft text-accent text-sm font-semibold px-3 py-1">잡모아 AI 취업 도우미</p>
                <h1 className="mt-4 text-3xl md:text-5xl font-bold text-text leading-tight tracking-tight">
                    취업 지원, 혼자 알아보지 마세요.<br />
                    <span className="text-accent">J.AI</span>가 24시간 함께합니다.
                </h1>
                <p className="mt-4 text-base md:text-lg text-text-secondary max-w-2xl">
                    국민취업지원제도 자격 확인부터 자기소개서까지 무료로 확인하고,
                    필요하면 잡모아 상담사에게 바로 이어서 상담받으세요.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-3">
                    <Link href="/chat" className="h-12 px-6 inline-flex items-center justify-center gap-2 rounded-[var(--radius-default)] bg-accent text-white font-bold hover:bg-accent-hover">
                        3분 모의진단 시작 <ArrowRight size={18} aria-hidden />
                    </Link>
                    <Link href="/ask" className="h-12 px-6 inline-flex items-center justify-center rounded-[var(--radius-default)] border border-border-strong bg-bg-elevated text-text font-semibold hover:border-accent">
                        궁금한 점 물어보기
                    </Link>
                </div>
            </section>

            <section aria-labelledby="services" className="mx-auto max-w-5xl px-4 pb-12">
                <h2 id="services" className="sr-only">서비스</h2>
                <div className="grid gap-4 md:grid-cols-3">
                    {SERVICES.map(({ href, icon: Icon, title, desc, cta }) => (
                        <Link key={href} href={href}
                            className="group flex flex-col rounded-[var(--radius-card)] border border-border bg-bg-elevated p-6 hover:border-accent hover:shadow-sm transition">
                            <span className="w-11 h-11 rounded-[var(--radius-default)] bg-accent-soft text-accent flex items-center justify-center">
                                <Icon size={22} aria-hidden />
                            </span>
                            <h3 className="mt-4 text-lg font-bold text-text">{title}</h3>
                            <p className="mt-2 text-text-secondary leading-relaxed flex-1">{desc}</p>
                            <span className="mt-4 text-accent font-semibold inline-flex items-center gap-1">
                                {cta} <ArrowRight size={16} aria-hidden className="group-hover:translate-x-0.5 transition-transform" />
                            </span>
                        </Link>
                    ))}
                </div>
            </section>

            <section aria-labelledby="flow" className="bg-bg-elevated border-y border-border">
                <div className="mx-auto max-w-5xl px-4 py-12">
                    <h2 id="flow" className="text-2xl font-bold text-text">이렇게 도와드려요</h2>
                    <ol className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                        {STEPS.map(s => (
                            <li key={s.n} className="rounded-[var(--radius-card)] bg-bg p-5">
                                <span className="text-accent font-bold">STEP {s.n}</span>
                                <p className="mt-1 font-bold text-text">{s.title}</p>
                                <p className="mt-1 text-sm text-text-secondary">{s.desc}</p>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            <footer className="mx-auto max-w-5xl px-4 py-8 text-sm text-text-muted space-y-2">
                <p>J.AI의 진단 결과는 참고용이며, 실제 자격은 고용센터 심사에 따라 달라질 수 있습니다.</p>
                <nav className="flex gap-4" aria-label="약관">
                    <Link href="/terms" className="hover:text-text">이용약관</Link>
                    <Link href="/privacy" className="hover:text-text font-semibold">개인정보처리방침</Link>
                    <Link href="/disclaimer" className="hover:text-text">면책조항</Link>
                </nav>
                <p>© ㈜잡모아</p>
            </footer>
        </div>
    );
}
