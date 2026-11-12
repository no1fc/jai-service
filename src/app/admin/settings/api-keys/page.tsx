'use client';

import React, { useState, useEffect } from 'react';
import { KeyRound, Loader2, Save, Trash2, Plus, Cpu, Map as MapIcon, Calculator, AlertTriangle } from 'lucide-react';
import { logger } from '@/lib/logger';
import { GEMINI_MODELS, DEFAULT_CHAT_MODEL, DEFAULT_ANALYSIS_MODEL, findGeminiModel } from '@/lib/gemini-models';

interface ApiGroupProps {
    title: string;
    description: string;
    settingKey: string;
    icon: React.ReactNode;
    keys: string[];
    onAdd: (settingKey: string, value: string) => Promise<void>;
    onDelete: (settingKey: string, index: number) => Promise<void>;
}

function ApiGroup({ title, description, settingKey, icon, keys, onAdd, onDelete }: ApiGroupProps) {
    const [newKey, setNewKey] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newKey.trim()) return;
        setIsSaving(true);
        await onAdd(settingKey, newKey.trim());
        setNewKey('');
        setIsSaving(false);
    };

    const handleDelete = async (index: number) => {
        if (!window.confirm('이 API Key를 삭제하시겠습니까?')) return;
        await onDelete(settingKey, index);
    };

    return (
        <div className="bg-[var(--color-bg-elevated)] rounded-[4px] border border-[var(--color-border)] overflow-hidden mb-8">
            <div className="p-6 border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2 text-[var(--color-text)] font-bold text-lg mb-1">
                        {icon}
                        {title}
                    </div>
                    <p className="text-[var(--color-text-muted)] text-sm">{description}</p>
                </div>
            </div>

            <div className="p-6 space-y-6">
                <div>
                    <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-3">등록된 API Keys (보안 처리됨)</h3>
                    {keys.length === 0 ? (
                        <div className="text-[var(--color-text-muted)] text-sm py-4 text-center border rounded-[4px] bg-[var(--color-bg)] border-dashed border-[var(--color-border)]">
                            등록된 API Key가 없습니다.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {keys.map((k, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-[var(--color-bg)] px-4 py-3 rounded-[4px] border border-[var(--color-border)]">
                                    <div className="flex items-center gap-3">
                                        <span className={`text-xs font-bold px-2 py-1 rounded-[4px] flex-shrink-0 ${idx === 0 ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]' : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)]'}`}>
                                            {idx === 0 ? '메인 Key' : `예비 Key ${idx}`}
                                        </span>
                                        <code className="text-sm text-[var(--color-text-secondary)] font-mono break-all line-clamp-1">
                                            {k}
                                        </code>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(idx)}
                                        className="text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 p-1.5 rounded-[4px] transition-colors flex-shrink-0 ml-2"
                                        title="삭제"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <hr className="border-[var(--color-border)]" />

                <form onSubmit={handleAdd} className="flex items-start gap-3">
                    <div className="flex-1">
                        <input
                            type="text"
                            value={newKey}
                            onChange={(e) => setNewKey(e.target.value)}
                            className="w-full px-4 py-2 border border-[var(--color-border)] rounded-[6px] focus:border-[var(--color-accent)] outline-none transition-all font-mono text-[var(--color-text)] bg-[var(--color-bg-elevated)]"
                            placeholder="새로운 API Key를 입력하세요..."
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isSaving || !newKey.trim()}
                        className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:bg-[var(--color-accent)]/50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-[4px] font-medium transition-colors flex items-center gap-2 whitespace-nowrap"
                    >
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus size={18} />}
                        키 추가
                    </button>
                </form>
            </div>
        </div>
    );
}

/**
 * 모델 선택 옵션 라벨: preview는 "(미리보기)", deprecated는 "(종료 예정)" 표시를 붙인다.
 * @param id - 모델 id
 */
function modelOptionLabel(id: string): string {
    const info = findGeminiModel(id);
    if (!info) return `${id} (지원 종료)`;
    if (info.status === 'preview') return `${info.label} (미리보기)`;
    if (info.status === 'deprecated') return `${info.label} (종료 예정)`;
    return info.label;
}

/**
 * 저장된 모델이 종료 예정이거나 카탈로그에 없을 때 경고를 보여준다.
 * 카탈로그에 없는 모델은 서버(resolveGeminiModel)가 기본 모델로 대체해 호출한다.
 */
function ModelWarning({ id, fallback }: { id: string; fallback: string }) {
    const info = findGeminiModel(id);
    if (id && !info) {
        return (
            <p className="text-xs text-[var(--color-danger)] flex items-center gap-1 mt-1">
                <AlertTriangle size={14} />
                지원이 종료된 모델입니다. 현재는 기본 모델({fallback})로 응답합니다. 다른 모델을 선택해 저장하세요.
            </p>
        );
    }
    if (info?.status === 'deprecated') {
        return (
            <p className="text-xs text-[var(--color-danger)] flex items-center gap-1 mt-1">
                <AlertTriangle size={14} />
                이 모델은 2026-12-01 종료 예정입니다. 다른 모델로 변경하세요.
            </p>
        );
    }
    return null;
}

export default function ApiKeysSettingsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [geminiKeys, setGeminiKeys] = useState<string[]>([]);
    const [kakaoKeys, setKakaoKeys] = useState<string[]>([]);
    const [geminiModel, setGeminiModel] = useState<string>(DEFAULT_CHAT_MODEL);
    const [geminiAnalysisModel, setGeminiAnalysisModel] = useState<string>(DEFAULT_ANALYSIS_MODEL);
    const [savingModelKey, setSavingModelKey] = useState<string | null>(null);
    const [inputTokens, setInputTokens] = useState<number>(1);
    const [outputTokens, setOutputTokens] = useState<number>(1);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/settings');
            const data = await res.json();
            if (data.success && data.settings) {
                // 배열 형태 파싱
                const parseStringArray = (val: string) => {
                    if (!val) return [];
                    try {
                        const parsed = JSON.parse(val);
                        if (Array.isArray(parsed)) return parsed;
                    } catch (e) {
                        // Fallback for non-JSON content
                    }
                    return [];
                };

                setGeminiKeys(parseStringArray(data.settings.gemini_api_keys_masked));
                setKakaoKeys(parseStringArray(data.settings.kakao_map_api_keys_masked));
                if (data.settings.gemini_model_name) {
                    setGeminiModel(data.settings.gemini_model_name);
                }
                if (data.settings.gemini_analysis_model_name) {
                    setGeminiAnalysisModel(data.settings.gemini_analysis_model_name);
                }
            }
        } catch (error) {
            logger.error('Failed to fetch settings:', error);
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * 일반/분석 모델 선택 변경을 설정 API에 저장한다.
     * @param settingKey - 'gemini_model_name' 또는 'gemini_analysis_model_name'
     * @param setter - 해당 모델의 React state setter
     */
    const handleModelChange = (settingKey: string, setter: (v: string) => void) => async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newModel = e.target.value;
        setter(newModel);
        setSavingModelKey(settingKey);

        try {
            const res = await fetch('/api/admin/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: settingKey, value: newModel })
            });
            const data = await res.json();

            if (!data.success) {
                alert(data.error || '모델 설정 저장 중 오류가 발생했습니다.');
            }
        } catch (error) {
            logger.error('Model change error:', error);
            alert('설정 저장 중 네트워크 오류가 발생했습니다.');
        } finally {
            setSavingModelKey(null);
        }
    };

    const handleAddKey = async (settingKey: string, value: string) => {
        try {
            const res = await fetch('/api/admin/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: settingKey, value, action: 'add' })
            });
            const data = await res.json();

            if (data.success) {
                await fetchSettings();
            } else {
                alert(data.error || '저장 중 오류가 발생했습니다.');
            }
        } catch (error) {
            logger.error('Add error:', error);
            alert('저장 중 네트워크 오류가 발생했습니다.');
        }
    };

    const handleDeleteKey = async (settingKey: string, index: number) => {
        try {
            const res = await fetch('/api/admin/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: settingKey, action: 'delete', index })
            });
            const data = await res.json();

            if (data.success) {
                await fetchSettings();
            } else {
                alert(data.error || '삭제 중 오류가 발생했습니다.');
            }
        } catch (error) {
            logger.error('Delete error:', error);
            alert('삭제 중 네트워크 오류가 발생했습니다.');
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-20 text-[var(--color-text-muted)]">
                <Loader2 className="animate-spin w-8 h-8 mr-3 text-[var(--color-accent)]" />
                <span>API 설정 정보를 불러오는 중입니다...</span>
            </div>
        );
    }

    return (
        <div className="max-w-4xl space-y-6 pb-12">
            <div>
                <h1 className="text-3xl font-bold text-[var(--color-text)]">통합 API Key 관리</h1>
                <p className="text-[var(--color-text-muted)] mt-2 max-w-2xl leading-relaxed">
                    시스템 전반(Gemini AI 및 카카오 지도 연동)에 사용되는 외부 서비스 API Key를 관리합니다.<br />
                    첫 번째로 등록된 Key가 메인으로 사용되며, 이후 등록된 Key들은 예비(Fallback) 용도로 사용됩니다.
                </p>
            </div>

            <div className="mt-8">
                {/* Gemini Model Selection & Cost Calculator */}
                <div className="bg-[var(--color-bg-elevated)] rounded-[4px] border border-[var(--color-border)] overflow-hidden mb-8">
                    <div className="p-6 bg-[var(--color-bg-elevated)] border-b border-[var(--color-border)] space-y-5">
                        <div>
                            <div className="flex items-center gap-2 text-[var(--color-text)] font-bold text-lg mb-1">
                                <Cpu className="text-[var(--color-accent)]" size={22} />
                                Gemini 생성 모델 선택
                            </div>
                            <p className="text-[var(--color-text-muted)] text-sm">용도별로 사용할 Gemini AI 모델을 선택하고 비용을 예상해보세요.</p>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <p className="text-sm font-medium text-[var(--color-text)]">일반 응답 모델 (Q&A·모의진단 설명)</p>
                                <ModelWarning id={geminiModel} fallback={DEFAULT_CHAT_MODEL} />
                            </div>
                            <div className="flex items-center">
                                {savingModelKey === 'gemini_model_name' && <span className="text-sm text-[var(--color-accent)] mr-3 flex items-center"><Loader2 className="w-4 h-4 animate-spin mr-1" /> 저장 중...</span>}
                                <select
                                    value={geminiModel}
                                    onChange={handleModelChange('gemini_model_name', setGeminiModel)}
                                    disabled={savingModelKey !== null}
                                    className="px-4 py-2 border border-[var(--color-accent)]/30 rounded-[6px] focus:border-[var(--color-accent)] outline-none transition-all text-[var(--color-text)] bg-[var(--color-bg-elevated)] font-medium cursor-pointer"
                                >
                                    {GEMINI_MODELS.map((info) => (
                                        <option key={info.id} value={info.id}>{modelOptionLabel(info.id)}</option>
                                    ))}
                                    {!findGeminiModel(geminiModel) && geminiModel !== '' && (
                                        <option value={geminiModel}>{modelOptionLabel(geminiModel)}</option>
                                    )}
                                </select>
                            </div>
                        </div>

                        <hr className="border-[var(--color-border)]" />

                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <p className="text-sm font-medium text-[var(--color-text)]">분석 모델 (자기소개서·상담사 리포트)</p>
                                <ModelWarning id={geminiAnalysisModel} fallback={DEFAULT_ANALYSIS_MODEL} />
                            </div>
                            <div className="flex items-center">
                                {savingModelKey === 'gemini_analysis_model_name' && <span className="text-sm text-[var(--color-accent)] mr-3 flex items-center"><Loader2 className="w-4 h-4 animate-spin mr-1" /> 저장 중...</span>}
                                <select
                                    value={geminiAnalysisModel}
                                    onChange={handleModelChange('gemini_analysis_model_name', setGeminiAnalysisModel)}
                                    disabled={savingModelKey !== null}
                                    className="px-4 py-2 border border-[var(--color-accent)]/30 rounded-[6px] focus:border-[var(--color-accent)] outline-none transition-all text-[var(--color-text)] bg-[var(--color-bg-elevated)] font-medium cursor-pointer"
                                >
                                    {GEMINI_MODELS.map((info) => (
                                        <option key={info.id} value={info.id}>{modelOptionLabel(info.id)}</option>
                                    ))}
                                    {!findGeminiModel(geminiAnalysisModel) && geminiAnalysisModel !== '' && (
                                        <option value={geminiAnalysisModel}>{modelOptionLabel(geminiAnalysisModel)}</option>
                                    )}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Cost Calculator Section (일반 응답 모델 단가 기준) */}
                    {findGeminiModel(geminiModel) && (
                        <div className="p-6 bg-[var(--color-bg-elevated)]">
                            <div className="flex items-center gap-2 text-[var(--color-text-secondary)] font-semibold mb-4">
                                <Calculator className="text-[var(--color-success)]" size={18} />
                                예상 비용 계산기 (일반 응답 모델, 100만 토큰 기준 단가적용)
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-sm text-[var(--color-text-secondary)] mb-1">예상 월별 입력 (백만 토큰)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.1"
                                            value={inputTokens}
                                            onChange={(e) => setInputTokens(parseFloat(e.target.value) || 0)}
                                            className="w-full pl-3 pr-8 py-2 border border-[var(--color-border)] rounded-[6px] focus:border-[var(--color-accent)] outline-none text-[var(--color-text)] bg-[var(--color-bg-elevated)]"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-sm">M</span>
                                    </div>
                                    <p className="text-xs text-[var(--color-text-muted)] mt-1">단가: ${findGeminiModel(geminiModel)!.inputRate.toFixed(2)}</p>
                                </div>
                                <div>
                                    <label className="block text-sm text-[var(--color-text-secondary)] mb-1">예상 월별 출력 (백만 토큰)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.1"
                                            value={outputTokens}
                                            onChange={(e) => setOutputTokens(parseFloat(e.target.value) || 0)}
                                            className="w-full pl-3 pr-8 py-2 border border-[var(--color-border)] rounded-[6px] focus:border-[var(--color-accent)] outline-none text-[var(--color-text)] bg-[var(--color-bg-elevated)]"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-sm">M</span>
                                    </div>
                                    <p className="text-xs text-[var(--color-text-muted)] mt-1">단가: ${findGeminiModel(geminiModel)!.outputRate.toFixed(2)}</p>
                                </div>
                                <div className="bg-[var(--color-success)]/10 border border-[var(--color-success)]/20 rounded-[4px] p-4 flex flex-col justify-center items-center">
                                    <span className="text-sm font-medium text-[var(--color-success)] mb-1">월별 예상 환산 금액</span>
                                    <span className="text-2xl font-bold text-[var(--color-success)]">
                                        ${((inputTokens * findGeminiModel(geminiModel)!.inputRate) + (outputTokens * findGeminiModel(geminiModel)!.outputRate)).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <ApiGroup
                    title="Google Gemini API (AI)"
                    description="J.AI 구동 및 AI 텍스트 생성에 사용되는 구글 제미나이 API Key 배열입니다."
                    settingKey="gemini_api_keys"
                    icon={<Cpu className="text-[var(--color-accent)]" size={22} />}
                    keys={geminiKeys}
                    onAdd={handleAddKey}
                    onDelete={handleDeleteKey}
                />

                <ApiGroup
                    title="Kakao Maps API (지도 연동)"
                    description="지점 위치 정보 조회 및 지도 렌더링에 사용되는 카카오 자바스크립트 API Key 배열입니다."
                    settingKey="kakao_map_api_keys"
                    icon={<MapIcon className="text-[var(--color-warning)]" size={22} />}
                    keys={kakaoKeys}
                    onAdd={handleAddKey}
                    onDelete={handleDeleteKey}
                />
            </div>
        </div>
    );
}
