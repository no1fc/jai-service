'use client';

import React, { useState, useEffect } from 'react';
import { ShieldPlus, Trash2, KeyRound, Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';

interface AdminUser {
    id: number;
    username: string;
    role: string;
    created_at: string;
}

export default function AdminUsersManagementPage() {
    const [admins, setAdmins] = useState<AdminUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // New Admin Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ username: '', password: '', role: 'admin' });
    const [isSaving, setIsSaving] = useState(false);

    // Password Change Modal State
    const [isPwModalOpen, setIsPwModalOpen] = useState(false);
    const [pwFormData, setPwFormData] = useState({ id: 0, password: '' });
    const [isPwSaving, setIsPwSaving] = useState(false);

    useEffect(() => {
        fetchAdmins();
    }, []);

    const fetchAdmins = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/users');
            const data = await res.json();
            if (data.success) {
                setAdmins(data.admins);
            }
        } catch (error) {
            logger.error('Failed to fetch admins:', error);
            alert('관리자 목록을 불러오지 못했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCreateAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (data.success) {
                await fetchAdmins();
                setIsModalOpen(false);
                setFormData({ username: '', password: '', role: 'admin' });
            } else {
                alert(data.error || '관리자 생성 실패');
            }
        } catch (error) {
            logger.error('Create admin error:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsPwSaving(true);
        try {
            const res = await fetch(`/api/admin/users/${pwFormData.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: pwFormData.password })
            });
            const data = await res.json();
            if (data.success) {
                setIsPwModalOpen(false);
                setPwFormData({ id: 0, password: '' });
                alert('비밀번호가 변경되었습니다.');
            } else {
                alert(data.error || '비밀번호 변경 실패');
            }
        } catch (error) {
            logger.error('Change password error:', error);
        } finally {
            setIsPwSaving(false);
        }
    };

    const handleDelete = async (id: number, username: string) => {
        if (!window.confirm(`정말 관리자 '${username}' 계정을 삭제하시겠습니까?`)) return;
        try {
            const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                await fetchAdmins();
            } else {
                alert(data.error || '삭제 실패');
            }
        } catch (error) {
            logger.error('Delete error:', error);
        }
    };

    const handleRoleChange = async (id: number, newRole: string) => {
        try {
            const res = await fetch(`/api/admin/users/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole })
            });
            const data = await res.json();
            if (data.success) {
                await fetchAdmins(); // Refresh list to show updated roles
            } else {
                alert(data.error || '권한 변경 실패');
            }
        } catch (error) {
            logger.error('Change role error:', error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--color-text)]">관리자 지정</h1>
                    <p className="text-[var(--color-text-muted)] mt-1">NESS 챗봇 시스템에 접근할 관리자 계정을 관리합니다.</p>
                </div>

                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-[var(--color-success)] hover:opacity-90 text-white px-4 py-2.5 rounded-[4px] font-medium transition-colors flex items-center gap-2"
                >
                    <ShieldPlus size={18} />
                    신규 계정 생성
                </button>
            </div>

            <div className="bg-[var(--color-bg-elevated)] rounded-[4px] border border-[var(--color-border)] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] text-sm font-semibold border-b border-[var(--color-border)]">
                                <th className="px-6 py-4">ID</th>
                                <th className="px-6 py-4">아이디 (Username)</th>
                                <th className="px-6 py-4">생성일</th>
                                <th className="px-6 py-4">역할</th>
                                <th className="px-6 py-4">관리</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border)]">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-[var(--color-text-muted)]">
                                        <Loader2 className="animate-spin w-5 h-5 text-[var(--color-accent)] mx-auto mb-2" />
                                        계정 정보를 불러오는 중...
                                    </td>
                                </tr>
                            ) : admins.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-[var(--color-text-muted)]">등록된 관리자가 없습니다.</td>
                                </tr>
                            ) : (
                                admins.map((admin) => (
                                    <tr key={admin.id} className="hover:bg-[var(--color-bg-elevated)] transition-colors">
                                        <td className="px-6 py-4 text-sm text-[var(--color-text-muted)]">#{admin.id}</td>
                                        <td className="px-6 py-4 font-medium text-[var(--color-text)]">{admin.username}</td>
                                        <td className="px-6 py-4 text-sm text-[var(--color-text-muted)]">
                                            {new Date(admin.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                value={admin.role}
                                                onChange={(e) => handleRoleChange(admin.id, e.target.value)}
                                                className={`px-2 py-1 text-xs font-semibold rounded-[4px] outline-none cursor-pointer appearance-none text-center ${admin.role === 'superadmin' ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]' : 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                                                    }`}
                                            >
                                                <option value="superadmin" className="bg-[var(--color-bg-elevated)] text-[var(--color-text)]">최고 관리자</option>
                                                <option value="admin" className="bg-[var(--color-bg-elevated)] text-[var(--color-text)]">일반 관리자</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => {
                                                        setPwFormData({ id: admin.id, password: '' });
                                                        setIsPwModalOpen(true);
                                                    }}
                                                    className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors p-1"
                                                    title="비밀번호 변경"
                                                >
                                                    <KeyRound size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(admin.id, admin.username)}
                                                    disabled={admin.role === 'superadmin' && admins.length === 1} // 마지막 남은 superadmin 삭제 방지 UI
                                                    className={`p-1 transition-colors ${admin.role === 'superadmin' && admins.length === 1
                                                        ? 'text-[var(--color-text-muted)] cursor-not-allowed'
                                                        : 'text-[var(--color-danger)] hover:text-[var(--color-danger)]'
                                                        }`}
                                                    title="계정 삭제"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 새 관리자 모달 */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(15,0,0,0.5)]">
                    <div className="bg-[var(--color-bg-elevated)] rounded-[4px] w-full max-w-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
                            <h2 className="text-xl font-bold text-[var(--color-text)]">신규 관리자 생성</h2>
                        </div>
                        <form onSubmit={handleCreateAdmin} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">아이디</label>
                                <input required name="username" value={formData.username} onChange={handleInputChange} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-[6px] focus:border-[var(--color-accent)] outline-none text-[var(--color-text)] bg-[var(--color-bg-elevated)]" placeholder="아이디 영문입력" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">임시 비밀번호</label>
                                <input required type="password" name="password" value={formData.password} onChange={handleInputChange} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-[6px] focus:border-[var(--color-accent)] outline-none text-[var(--color-text)] bg-[var(--color-bg-elevated)]" placeholder="••••••••" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">역할</label>
                                <select name="role" value={formData.role} onChange={handleInputChange} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-[6px] focus:border-[var(--color-accent)] outline-none text-[var(--color-text)] bg-[var(--color-bg-elevated)]">
                                    <option value="admin">일반 관리자</option>
                                    <option value="superadmin">최고 관리자</option>
                                </select>
                            </div>
                            <div className="pt-4 flex justify-end gap-3 border-t border-[var(--color-border)] mt-6">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] rounded-[4px]">취소</button>
                                <button disabled={isSaving} type="submit" className="px-4 py-2 bg-[var(--color-success)] hover:opacity-90 text-white rounded-[4px] flex items-center">
                                    {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}생성
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 비밀번호 변경 모달 */}
            {isPwModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(15,0,0,0.5)]">
                    <div className="bg-[var(--color-bg-elevated)] rounded-[4px] w-full max-w-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
                            <h2 className="text-xl font-bold text-[var(--color-text)]">비밀번호 변경</h2>
                        </div>
                        <form onSubmit={handleChangePassword} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">새 비밀번호</label>
                                <input required type="password" value={pwFormData.password} onChange={(e) => setPwFormData(p => ({ ...p, password: e.target.value }))} className="w-full px-3 py-2 border border-[var(--color-border)] rounded-[6px] focus:border-[var(--color-accent)] outline-none text-[var(--color-text)] bg-[var(--color-bg-elevated)]" placeholder="강력한 암호 입력" />
                            </div>
                            <div className="pt-4 flex justify-end gap-3 border-t border-[var(--color-border)] mt-6">
                                <button type="button" onClick={() => setIsPwModalOpen(false)} className="px-4 py-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] rounded-[4px]">취소</button>
                                <button disabled={isPwSaving} type="submit" className="px-4 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white rounded-[4px] flex items-center">
                                    {isPwSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}변경
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
