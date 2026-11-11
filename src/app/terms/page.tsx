import Link from "next/link";
import { MoveLeft } from "lucide-react";

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-bg text-text p-8 md:p-20 font-mono">
            <nav className="mb-20">
                <Link href="/" className="inline-flex items-center gap-4 text-text-muted hover:text-text transition-colors group">
                    <MoveLeft className="transform group-hover:-translate-x-2 transition-transform" />
                    <span className="font-bold tracking-widest text-xs uppercase">Back to Home</span>
                </Link>
            </nav>

            <main className="max-w-3xl mx-auto pb-40">
                <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">서비스 이용약관</h1>
                <p className="text-accent font-mono text-sm mb-16">Last updated: March 09, 2026</p>

                <div className="space-y-12 text-text-secondary leading-relaxed font-medium">
                    <section>
                        <h2 className="text-2xl font-bold text-text mb-6">제1조 (목적)</h2>
                        <p>본 약관은 NESS AI SYSTEM(이하 &quot;서비스 제공자&quot;)이 제공하는 국민취업지원제도 안내 챗봇 서비스(이하 &quot;서비스&quot;)의 이용과 관련하여 제공자와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-text mb-6">제2조 (정보의 제공 및 한계)</h2>
                        <p className="mb-4">1. 본 서비스는 국민취업지원제도와 관련된 법령 및 공개된 지침을 기초로 AI가 학습하여 정보를 제공하는 편의성 보조 도구입니다.</p>
                        <p>2. 제공되는 정보의 완전성, 정확성, 최신성을 보증하지 않으며 정식 행정 절차나 고용노동부의 공식 답변을 대체할 수 없습니다. 중요한 법률적 판단이나 수당 수급 자격 심사는 반드시 관할 고용센터를 통한 별도의 확인이 필요합니다.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-text mb-6">제3조 (이용자의 의무)</h2>
                        <p className="mb-4">1. 이용자는 서비스를 불법적이거나 부당한 목적으로 사용해서는 안 됩니다.</p>
                        <p>2. 서비스의 안내 내용을 기반으로 행한 결정이나 행동에 대한 최종 책임은 이용자 본인에게 있습니다.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-text mb-6">제4조 (서비스 중단 및 변경)</h2>
                        <p>서비스 제공자는 기술적 필요, 운영상의 문제, 혹은 관련 제도의 개편 등 합리적인 사유가 있을 시 예고 없이 서비스의 일부 또는 전부를 수정, 중단, 또는 폐지할 수 있습니다.</p>
                    </section>
                </div>
            </main>
        </div>
    );
}
