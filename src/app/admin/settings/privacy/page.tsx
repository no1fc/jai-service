'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, RotateCcw, Save, XCircle } from 'lucide-react';
import { logger } from '@/lib/logger';
import { DEFAULT_PRIVACY_POLICY, PRIVACY_POLICY_MAX_CHARS, hasPlaceholder, parsePolicy } from '@/lib/privacy/policy';
import { PolicyView } from '@/components/privacy/PolicyView';

type SaveResult = { kind: 'success' | 'error'; message: string } | null;

/**
 * 개인정보처리방침 관리자 편집 화면.
 * 좌측 에디터에서 간단한 서식(`## 제목`/`### 소제목`/`- 목록`/빈 줄=문단)으로 본문을 작성하면
 * 우측(모바일은 아래)에 같은 스타일의 실시간 미리보기가 즉시 반영된다.
 * 저장은 superadmin 권한에서만 성공한다(서버가 재검증).
 */
export default function PrivacySettingsPage() {
    const [policy, setPolicy] = useState('');
    const [updatedAt, setUpdatedAt] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveResult, setSaveResult] = useState<SaveResult>(null);

    useEffect(() => {
        fetchPolicy();
    }, []);

    const fetchPolicy = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/privacy');
            const data = await res.json();
            if (data.success) {
                setPolicy(data.policy || '');
                setUpdatedAt(data.updatedAt || null);
            } else {
                setSaveResult({ kind: 'error', message: data.error || '개인정보처리방침을 불러오지 못했습니다.' });
            }
        } catch (error) {
            logger.error('개인정보처리방침 조회 실패:', error);
            setSaveResult({ kind: 'error', message: '네트워크 오류로 불러오지 못했습니다.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        setSaveResult(null);
        try {
            const res = await fetch('/api/admin/privacy', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ policy }),
            });
            const data = await res.json();
            if (data.success) {
                setUpdatedAt(data.updatedAt || null);
                setSaveResult({ kind: 'success', message: data.message || '저장되었습니다.' });
            } else {
                setSaveResult({ kind: 'error', message: data.error || '저장 중 오류가 발생했습니다.' });
            }
        } catch (error) {
            logger.error('개인정보처리방침 저장 실패:', error);
            setSaveResult({ kind: 'error', message: '네트워크 오류로 저장하지 못했습니다.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleResetToDefault = () => {
        if (!window.confirm('편집기 내용을 기본 개정본으로 되돌립니다. (저장 버튼을 눌러야 실제로 반영됩니다)')) return;
        setPolicy(DEFAULT_PRIVACY_POLICY);
        setSaveResult(null);
    };

    const previewBlocks = useMemo(() => parsePolicy(policy), [policy]);
    const showPlaceholderWarning = hasPlaceholder(policy);
    const charCount = policy.length;
    const isOverLimit = charCount > PRIVACY_POLICY_MAX_CHARS;

    return (
        <div className="max-w-7xl space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-[var(--color-text)]">개인정보처리방침 관리</h1>
                <p className="text-[var(--color-text-muted)] mt-1">
                    공개 페이지(/privacy)에 노출되는 본문을 편집합니다. 형식: <code>## 제목</code> / <code>### 소제목</code> / <code>- 목록</code> / 빈 줄 = 문단 구분.
                </p>
                {updatedAt && (
                    <p className="text-[var(--color-text-muted)] text-sm mt-1">최종 수정일: {updatedAt}</p>
                )}
            </div>

            {showPlaceholderWarning && (
                <div
                    role="alert"
                    className="flex items-start gap-3 bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/30 text-[var(--color-text)] rounded-[4px] p-4"
                >
                    <AlertTriangle className="text-[var(--color-warning)] shrink-0 mt-0.5" size={20} />
                    <p className="text-sm">보호책임자 등 [입력 필요] 항목을 채운 뒤 저장하세요.</p>
                </div>
            )}

            {saveResult && (
                <div
                    role="status"
                    className={`flex items-start gap-3 rounded-[4px] p-4 text-sm ${
                        saveResult.kind === 'success'
                            ? 'bg-[var(--color-success)]/10 border border-[var(--color-success)]/30 text-[var(--color-success)]'
                            : 'bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 text-[var(--color-danger)]'
                    }`}
                >
                    {saveResult.kind === 'success' ? (
                        <CheckCircle2 className="shrink-0 mt-0.5" size={20} />
                    ) : (
                        <XCircle className="shrink-0 mt-0.5" size={20} />
                    )}
                    <p>{saveResult.message}</p>
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-6 min-h-[600px]">
                {/* 좌측 에디터 */}
                <div className="flex-1 bg-[var(--color-bg-elevated)] rounded-[4px] border border-[var(--color-border)] flex flex-col min-w-0">
                    <div className="p-4 border-b border-[var(--color-border)] flex flex-wrap justify-between items-center gap-3">
                        <span className="font-semibold text-[var(--color-text)]">본문 편집</span>
                        <div className="flex items-center gap-3">
                            <span className={`text-xs font-medium ${isOverLimit ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-muted)]'}`}>
                                {charCount.toLocaleString()} / {PRIVACY_POLICY_MAX_CHARS.toLocaleString()}자
                            </span>
                            <button
                                type="button"
                                onClick={handleResetToDefault}
                                disabled={isLoading}
                                className="min-h-11 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] bg-[var(--color-bg)] hover:bg-[var(--color-border)] border border-[var(--color-border)] rounded-[4px] transition-colors disabled:opacity-50"
                            >
                                <RotateCcw size={16} />
                                기본 개정본으로 되돌리기
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={isLoading || isSaving}
                                className="min-h-11 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:bg-[var(--color-accent)]/50 disabled:cursor-not-allowed rounded-[4px] transition-colors"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={16} />}
                                저장
                            </button>
                        </div>
                    </div>

                    <label htmlFor="privacy-policy-editor" className="sr-only">개인정보처리방침 본문</label>
                    <textarea
                        id="privacy-policy-editor"
                        value={policy}
                        onChange={(e) => setPolicy(e.target.value)}
                        disabled={isLoading}
                        spellCheck="false"
                        className="w-full flex-1 min-h-[500px] p-6 resize-none outline-none font-mono text-sm leading-relaxed text-[var(--color-text)] bg-[var(--color-bg)] focus:ring-2 focus:ring-inset focus:ring-[var(--color-accent)] disabled:bg-[var(--color-bg-elevated)] disabled:text-[var(--color-text-muted)] transition-colors"
                        placeholder={isLoading ? '불러오는 중...' : '## 제1조 (수집하는 개인정보의 항목)\n\n- 항목 1\n- 항목 2'}
                    />
                </div>

                {/* 우측(모바일은 아래) 실시간 미리보기 */}
                <div className="flex-1 bg-[var(--color-bg-elevated)] rounded-[4px] border border-[var(--color-border)] flex flex-col min-w-0 overflow-hidden">
                    <div className="p-4 border-b border-[var(--color-border)]">
                        <span className="font-semibold text-[var(--color-text)]">미리보기</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 bg-[var(--color-bg)]">
                        <PolicyView blocks={previewBlocks} />
                    </div>
                </div>
            </div>
        </div>
    );
}
