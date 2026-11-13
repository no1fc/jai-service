import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/layout/Header';

// SEO 메타데이터 설정
export const metadata: Metadata = {
  title: 'J.AI | 잡모아 AI 취업 도우미',
  description:
    '국민취업지원제도 24시 Q&A, 수급자격 모의진단, AI 1분 자기소개서·역량 진단까지. 잡모아 J.AI가 무료로 도와드립니다.',
  keywords: ['국민취업지원제도', '국취', '구직촉진수당', '자기소개서', '역량진단', 'AI 상담', '잡모아', 'J.AI'],
  openGraph: {
    title: 'J.AI | 잡모아 AI 취업 도우미',
    description: '궁금한 건 바로 묻고, 내 유형과 역량을 1분 만에 확인하세요.',
    type: 'website',
    locale: 'ko_KR',
  },
};

/**
 * 루트 레이아웃 컴포넌트
 * 모든 페이지를 감싸는 최상위 HTML 구조
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-bg text-text">
        <div className="app-container">
          <Header />
          <main className="flex-1">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
