'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';

export default function AdminLoginPage() {
    const [id, setId] = useState('');
    const [password, setPassword] = useState('');
    const [errorMSG, setErrorMSG] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMSG(''); // 에러 메시지 초기화

        try {
            const response = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, password }),
            });

            const data = await response.json();

            if (response.ok) {
                // 성공 시 관리자 페이지 대시보드로 리다이렉션
                router.push('/admin');
            } else {
                setErrorMSG(data.error || '로그인에 실패했습니다.');
            }
        } catch (error) {
            logger.error('로그인 에러:', error);
            setErrorMSG('네트워크 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--color-bg)] flex flex-col justify-center items-center">
            <div className="bg-[var(--color-bg-elevated)] p-8 rounded-[4px] w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-[var(--color-accent)] mb-2">J.AI Admin</h1>
                    <p className="text-[var(--color-text-muted)]">관리자 계정으로 로그인해주세요.</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1" htmlFor="id">
                            아이디
                        </label>
                        <input
                            id="id"
                            type="text"
                            value={id}
                            onChange={(e) => setId(e.target.value)}
                            className="w-full px-4 py-2 border border-[var(--color-border)] rounded-[6px] focus:border-[var(--color-accent)] outline-none transition-all text-[var(--color-text)] bg-[var(--color-bg-elevated)]"
                            placeholder="admin"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1" htmlFor="password">
                            비밀번호
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 border border-[var(--color-border)] rounded-[6px] focus:border-[var(--color-accent)] outline-none transition-all text-[var(--color-text)] bg-[var(--color-bg-elevated)]"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {errorMSG && (
                        <div className="p-3 bg-[var(--color-danger)]/10 text-[var(--color-danger)] rounded-[4px] text-sm border border-[var(--color-danger)]/20">
                            {errorMSG}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-[var(--color-accent)] text-white py-2.5 rounded-[4px] font-medium hover:bg-[var(--color-accent-hover)] focus:border-[var(--color-accent)] transition-all flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                로그인 중...
                            </>
                        ) : (
                            '로그인'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
