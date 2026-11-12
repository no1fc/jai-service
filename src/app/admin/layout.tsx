'use client';

import React from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';
import {
    Building2,
    Users,
    KeyRound,
    MessageSquareText,
    LogOut,
    Menu,
    X,
    LayoutDashboard,
    Lock,
    BarChart3,
    Inbox
} from 'lucide-react';

const SIDEBAR_ITEMS = [
    { name: '대시보드', href: '/admin', icon: LayoutDashboard, requiresSuperAdmin: false },
    { name: '상담 신청', href: '/admin/leads', icon: Inbox, requiresSuperAdmin: false },
    { name: '사용량 통계', href: '/admin/usage', icon: BarChart3, requiresSuperAdmin: false },
    { name: '지점 등록', href: '/admin/branches', icon: Building2, requiresSuperAdmin: false },
    { name: '관리자 지정', href: '/admin/users', icon: Users, requiresSuperAdmin: true },
    { name: 'API 설정', href: '/admin/settings/api-keys', icon: KeyRound, requiresSuperAdmin: false },
    { name: '프롬프트 관리', href: '/admin/settings/prompts', icon: MessageSquareText, requiresSuperAdmin: true },
];

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
    const [userRole, setUserRole] = React.useState<string | null>(null);
    const pathname = usePathname();
    const router = useRouter();

    React.useEffect(() => {
        // 클라이언트 사이드에서 현재 접속한 관리자 권한 확인 (권한이 필요한 메뉴 라우팅/렌더링용)
        if (pathname !== '/admin/login') {
            fetch('/api/admin/me')
                .then(res => res.json())
                .then(data => {
                    if (data.success && data.user) {
                        setUserRole(data.user.role || 'admin');
                    }
                })
                .catch(err => logger.error('Failed to fetch user role:', err));
        }
    }, [pathname]);

    // 로그인 페이지 등에서는 레이아웃을 씌우지 않음
    if (pathname === '/admin/login') {
        return <>{children}</>;
    }

    const handleLogout = async () => {
        try {
            await fetch('/api/admin/logout', { method: 'POST' });
            router.push('/admin/login');
            router.refresh();
        } catch (error) {
            logger.error('로그아웃 실패', error);
            alert('로그아웃에 실패했습니다.');
        }
    };

    return (
        <div className="h-screen overflow-hidden bg-[var(--color-bg)] flex">
            {/* 모바일 햄버거 메뉴 버튼 */}
            <button
                className="lg:hidden fixed top-4 right-4 z-50 p-2 bg-[var(--color-bg-elevated)] rounded-[4px] text-[var(--color-text-secondary)]"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* 사이드바 (어두운 배경을 유지해 대비를 지킨다) */}
            <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-text text-white transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:flex-shrink-0 flex flex-col
      `}>
                <div className="h-20 flex items-center px-6 border-b border-white/10">
                    <Link href="/admin" className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                        <span className="text-[var(--color-accent)]">NESS</span> <span className="text-white/60 text-lg font-medium">관리자</span>
                    </Link>
                </div>

                <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
                    {SIDEBAR_ITEMS.map((item) => {
                        const isActive = pathname === item.href
                            || (item.href !== '/admin' && pathname.startsWith(item.href));

                        // 최고 관리자용 메뉴인데 일반 관리자일 경우 비활성화 처리
                        const isDisabled = item.requiresSuperAdmin && userRole !== 'superadmin';

                        if (isDisabled) {
                            return (
                                <div
                                    key={item.href}
                                    className="flex items-center justify-between px-4 py-3 rounded-[4px] text-sm font-medium text-white/40 bg-white/5 cursor-not-allowed"
                                    title="최고 관리자 전용 메뉴입니다"
                                >
                                    <div className="flex items-center gap-3 opacity-60">
                                        <item.icon size={18} />
                                        {item.name}
                                    </div>
                                    <Lock size={14} className="text-white/40" />
                                </div>
                            );
                        }

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`
                  flex items-center gap-3 px-4 py-3 rounded-[4px] text-sm font-medium transition-colors
                  ${isActive
                                        ? 'bg-[var(--color-accent)] text-white'
                                        : 'text-white/70 hover:bg-white/10 hover:text-white'}
                `}
                            >
                                <item.icon size={18} />
                                {item.name}
                            </Link>
                        )
                    })}
                </nav>

                <div className="p-4 border-t border-white/10">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 w-full rounded-[4px] text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                    >
                        <LogOut size={18} />
                        로그아웃
                    </button>
                </div>
            </aside>

            {/* 메인 콘텐츠 영역 */}
            <main className="flex-1 flex flex-col h-full w-full lg:w-[calc(100%-16rem)] overflow-hidden">
                {/* 모바일 헤더용 여백 */}
                <div className="h-16 lg:h-0 bg-[var(--color-bg-elevated)] lg:bg-transparent flex items-center px-6 lg:p-0">
                    <span className="font-semibold text-[var(--color-text)] lg:hidden">NESS Admin</span>
                </div>

                <div className="flex-1 p-6 lg:p-8 overflow-auto">
                    <ErrorBoundary section="관리자">
                        {children}
                    </ErrorBoundary>
                </div>
            </main>

            {/* 모바일 오버레이 */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-[rgba(15,0,0,0.5)] z-30 lg:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}
        </div>
    );
}
