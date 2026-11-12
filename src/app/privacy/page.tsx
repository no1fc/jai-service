import Link from "next/link";
import { MoveLeft } from "lucide-react";

// 개인정보 보호책임자 정보
// 배포 전 반드시 실제 담당자 정보로 교체 (배포.md 체크리스트 참고)
const PRIVACY_OFFICER = {
    name: '[입력 필요]',
    position: '[입력 필요]',
    phone: '[입력 필요]',
    email: '[입력 필요]',
};

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
                <p className="text-accent font-mono text-sm mb-16">최종 수정일: 2026-11-12</p>

                <div className="space-y-12 text-text-secondary leading-relaxed font-medium">
                    <section>
                        <p>
                            잡모아(이하 &apos;회사&apos;)는 국민취업지원제도 안내 서비스 J.AI(이하 &apos;서비스&apos;)를 운영하며,
                            이용자의 개인정보를 중요시하고 「개인정보보호법」 등 관련 법령을 준수합니다.
                            본 방침은 서비스가 수집하는 개인정보의 항목, 목적, 보유 기간 및 처리 방법을 안내합니다.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-text mb-6">제1조 (수집하는 개인정보의 항목)</h2>
                        <p className="mb-2 font-bold text-text">1. 상담 신청 시 수집 항목</p>
                        <ul className="list-disc pl-5 space-y-2 mb-4">
                            <li>이름, 휴대폰 번호, 거주 지역, 희망 직무(선택)</li>
                            <li>진단·상담 내용: 모의진단 응답·결과, 자기소개서·역량 진단 입력·결과, Q&amp;A 질문</li>
                        </ul>
                        <p className="mb-2 font-bold text-text">2. 서비스 이용 시 수집 항목</p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>Q&amp;A 질문: 챗봇과의 문답 내용 (상담 신청으로 이어지는 경우에만 위 1항에 포함되어 저장)</li>
                            <li>자기소개서·역량 진단 입력: 상담 신청 시에만 저장되며, 상담 신청 없이 결과만 확인한 경우 서버에 저장되지 않습니다.</li>
                            <li>접속 IP: 비정상적인 반복 요청(남용) 방지를 위해 서버 메모리에서 일시적으로만 처리하며, DB에 저장하지 않습니다.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-text mb-6">제2조 (개인정보의 수집·이용 목적)</h2>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>국민취업지원제도 상담 연락 및 맞춤 안내</li>
                            <li>Q&amp;A·모의진단·자기소개서 작성 지원 등 AI 기반 서비스 제공</li>
                            <li>부정 이용 방지 및 서비스 안정적 운영</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-text mb-6">제3조 (보유·이용 기간 및 파기)</h2>
                        <p className="mb-4">상담 신청을 통해 수집한 개인정보는 신청일로부터 1년이 경과하면 지체 없이 파기합니다.</p>
                        <p className="mb-2 font-bold text-text">파기 절차 및 방법</p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>전자적 파일 형태로 저장된 개인정보는 복구·재생이 불가능한 방법으로 영구 삭제합니다.</li>
                            <li>파기는 매 분기 1회 이상 수동 또는 배치 작업으로 수행합니다.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-text mb-6">제4조 (동의 거부 권리와 불이익)</h2>
                        <p>
                            이용자는 개인정보 수집·이용에 대한 동의를 거부할 권리가 있습니다.
                            다만 상담 신청에 필요한 최소한의 개인정보이므로, 동의를 거부할 경우 상담 신청 및
                            맞춤 안내 서비스 이용이 제한될 수 있습니다. Q&amp;A·모의진단 등 상담 신청 외 기능은
                            동의 여부와 관계없이 계속 이용할 수 있습니다.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-text mb-6">제5조 (개인정보 처리 위탁 및 국외 이전)</h2>
                        <p className="mb-4">
                            회사는 AI 응답·분석 생성을 위해 아래와 같이 개인정보를 국외로 이전합니다.
                        </p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>이전받는 자: Google LLC (미국)</li>
                            <li>이전 항목: Q&amp;A 질문, 모의진단 응답, 자기소개서 입력, 상담사 리포트 생성 시 이름·연락처를 제외한 진단 데이터</li>
                            <li>이전 시점 및 방법: 서비스 이용 시 Google Gemini API를 통해 네트워크로 전송</li>
                            <li>이전 목적: AI 답변·분석 결과 생성</li>
                            <li>보유 기간: Google의 API 데이터 처리 정책에 따름</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-text mb-6">제6조 (정보주체의 권리와 행사 방법)</h2>
                        <p>
                            이용자는 언제든지 자신의 개인정보에 대해 열람, 정정, 삭제, 처리정지를 요구할 수 있습니다.
                            아래 개인정보 보호책임자에게 전화 또는 이메일로 요청하면 지체 없이 조치합니다.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-text mb-6">제7조 (개인정보 보호책임자)</h2>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>성명: {PRIVACY_OFFICER.name}</li>
                            <li>직책: {PRIVACY_OFFICER.position}</li>
                            <li>전화: {PRIVACY_OFFICER.phone}</li>
                            <li>이메일: {PRIVACY_OFFICER.email}</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-text mb-6">제8조 (개인정보의 안전성 확보 조치)</h2>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>전송 구간 암호화: 이용자와 서버 간 통신은 HTTPS로 암호화합니다.</li>
                            <li>접근 권한 관리: 관리자 화면은 역할 기반 계정으로만 접근할 수 있습니다.</li>
                            <li>관리자 화면에 표시되는 이용자 연락처는 마스킹 처리합니다.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-text mb-6">제9조 (고지 의무)</h2>
                        <p>
                            본 방침의 내용이 추가, 삭제 및 수정이 있을 경우 변경사항의 시행 7일 전부터
                            서비스 내 공지사항을 통해 고지합니다.
                        </p>
                    </section>
                </div>
            </main>
        </div>
    );
}
