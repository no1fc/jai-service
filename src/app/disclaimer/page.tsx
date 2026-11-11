import Link from "next/link";
import { MoveLeft } from "lucide-react";

export default function DisclaimerPage() {
    return (
        <div className="min-h-screen bg-bg text-text p-8 md:p-20 font-mono">
            <nav className="mb-20">
                <Link href="/" className="inline-flex items-center gap-4 text-text-muted hover:text-text transition-colors group">
                    <MoveLeft className="transform group-hover:-translate-x-2 transition-transform" />
                    <span className="font-bold tracking-widest text-xs uppercase">Back to Home</span>
                </Link>
            </nav>

            <main className="max-w-3xl mx-auto pb-40">
                <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">면책공고 (Disclaimer)</h1>
                <p className="text-accent font-mono text-sm mb-16">Last updated: March 09, 2026</p>

                <div className="space-y-12 text-text-secondary leading-relaxed font-medium">
                    <section>
                        <h2 className="text-2xl font-bold text-text mb-6">정보 제공의 한계</h2>
                        <p>1. J.AI by 잡모아(이하 &quot;본 서비스&quot;)는 인공지능 언어모델을 기반으로 국민취업지원제도에 대한 정보를 안내하기 위한 데모 및 참고 목적으로 개발되었습니다.</p>
                        <p className="mt-4">2. 챗봇이 생성한 모든 답변, 수당 예상 수급액, 1/2유형 분류 예측, 추천 내용 등은 대한민국 고용노동부, 고용센터 및 관련 공식 정부 부처의 유권해석이나 법적 판단을 전혀 대변하지 않습니다.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-text mb-6">오류의 존재 가능성 안내</h2>
                        <p>본 서비스의 AI는 방대한 정책 문서를 기반으로 학습했으나, 최신 법 개정 사항, 판례, 그리고 개개인의 극히 세부적이고 예외적인 조건(예: 군필자 예외 공제액, 특수 형태 근로 복합 소득 등)을 100% 완전무결하게 반영하지 못할 수 있으며, 시스템 환각(Hallucination) 오류가 발생할 가능성이 존재합니다.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-text mb-6">법적 책임의 면제</h2>
                        <p className="mb-4">따라서, 본 서비스 제공자와 개발자는 다음의 경우에 대하여 어떠한 법적, 도의적, 재산상 손실의 책임도 부담하지 않습니다.</p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>본 서비스가 안내한 정보에 전적으로 의존하여 취업, 이직, 퇴사, 교육 수강 등 중대한 결정을 내림으로써 발생한 피해</li>
                            <li>본 서비스의 진단 결과를 바탕으로 관할 고용센터에 수급 자격을 요구하여 거절당한 경우의 결과</li>
                            <li>시스템 다운타임, 서비스 중단, 답변 지연으로 인한 간접적인 시간 및 기회비용 손실</li>
                        </ul>
                    </section>

                    <div className="p-8 border-l-4 border-accent bg-accent-soft rounded-r-2xl mt-16 font-semibold text-text-secondary">
                        <p className="mb-4 text-xl">실제 신청은 공식 기관으로!</p>
                        <p className="text-sm">수당 수급 자격이나 국민취업지원제도의 실제 신청, 결정에 대한 법적 효력을 원하시는 사용자는 반드시 &apos;국민취업지원제도 공식 홈페이지(www.kua.go.kr)&apos; 또는 &apos;거주지 관할 고용복지플러스센터(국번없이 1350)&apos;에 문의하시기 바랍니다.</p>
                    </div>
                </div>
            </main>
        </div>
    );
}
