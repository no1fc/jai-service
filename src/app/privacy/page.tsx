import Link from "next/link";
import { MoveLeft } from "lucide-react";

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-bg text-text p-8 md:p-20 font-mono">
            <nav className="mb-20">
                <Link href="/" className="inline-flex items-center gap-4 text-text-muted hover:text-text transition-colors group">
                    <MoveLeft className="transform group-hover:-translate-x-2 transition-transform" />
                    <span className="font-bold tracking-widest text-xs uppercase">Back to Home</span>
                </Link>
            </nav>

            <main className="max-w-3xl mx-auto pb-40">
                <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">개인정보처리방침</h1>
                <p className="text-accent font-mono text-sm mb-16">Last updated: March 09, 2026</p>

                <div className="space-y-12 text-text-secondary leading-relaxed font-medium">
                    <section>
                        <h2 className="text-2xl font-bold text-text mb-6">제1조 (수집하는 개인정보 항목)</h2>
                        <p className="mb-4">본 서비스는 국민취업지원제도 정보 안내를 위한 챗봇으로, 회원가입 절차 없이 누구나 이용할 수 있습니다.</p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>대화 중 자격 진단을 위해 자발적으로 입력한 연령, 가구원 수, 소득구간 등 익명 정보</li>
                            <li>서비스 이용 기록, 접속 로그, 쿠키, 검색어 입력 내역 (서비스 품질 향상을 위함)</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-text mb-6">제2조 (개인정보의 처리 목적)</h2>
                        <p className="mb-4">수집된 정보는 다음의 목적을 위해서만 활용됩니다.</p>
                        <p>1. 맞춤형 챗봇 서비스 분석 및 고도화</p>
                        <p>2. 국민취업지원제도 수급 자격 가설 진단 결과 안내 모델 개선</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-text mb-6">제3조 (개인정보의 보존 기간 및 파기)</h2>
                        <p className="mb-4">1. 이용자가 대화 세션을 종료하거나 브라우저를 닫을 경우, 챗봇과 대화하며 입력된 민감성 상황 데이터는 즉시 1차 폐기됩니다.</p>
                        <p>2. 시스템 로그를 위해 서버에 기록된 익명화된 데이터 정보는 수집일로부터 1년간 보관된 후 복구 불가능한 방법으로 파기됩니다.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-text mb-6">제4조 (이용자의 권리 보장)</h2>
                        <p>이용자는 개인을 특정할 수 있는 정보(이름, 주민번호 등)를 대화창에 절대 입력하지 않을 권리 및 주의 의무가 있으며, 시스템은 이러한 개인정보를 별도로 요구하지 않습니다.</p>
                    </section>
                </div>
            </main>
        </div>
    );
}
