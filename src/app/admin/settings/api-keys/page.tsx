'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { KeyRound, Loader2, Save, Trash2, Plus, Cpu, Map as MapIcon, Calculator, AlertTriangle, Plug, BookOpen } from 'lucide-react';
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

interface SecretFieldProps {
    label: string;
    settingKey: string;
    maskedValue: string;
    onSave: (key: string, value: string) => Promise<void>;
    /** false면 식별자/URL(마스킹 대상 아님)이라 일반 text 입력으로 보여준다. 기본값 true(비밀값). */
    isSecret?: boolean;
}

/**
 * "외부 연동" 단일 값 비밀값 입력 — 배열형 ApiGroup과 달리 키 하나당 값 하나만 저장한다.
 * 비밀값(isSecret)은 입력창을 type="password" + autoComplete="off"로 가려 화면 노출·자동완성 저장을 막는다.
 */
function SecretField({ label, settingKey, maskedValue, onSave, isSecret = true }: SecretFieldProps) {
    const [value, setValue] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const inputId = `secret-${settingKey}`;

    const handleSave = async () => {
        if (!value.trim()) return;
        setIsSaving(true);
        await onSave(settingKey, value.trim());
        setValue('');
        setIsSaving(false);
    };

    return (
        <div className="flex items-center justify-between gap-3 py-3 flex-wrap">
            <div>
                <label htmlFor={inputId} className="text-sm font-medium text-[var(--color-text)]">{label}</label>
                <p><code className="text-xs text-[var(--color-text-muted)]">{maskedValue || '저장된 값 없음'}</code></p>
            </div>
            <div className="flex items-center gap-2">
                <input
                    id={inputId}
                    type={isSecret ? 'password' : 'text'}
                    autoComplete="off"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
                    placeholder="새 값 입력(저장 시 이전 값 덮어씀)"
                    className="h-11 px-3 border border-[var(--color-border)] rounded-[4px] text-sm bg-[var(--color-bg-elevated)] text-[var(--color-text)]"
                />
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving || !value.trim()}
                    className="h-11 text-sm px-4 rounded-[4px] bg-[var(--color-accent)] text-white disabled:opacity-50"
                >
                    저장
                </button>
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
    // "외부 연동" — 배열이 아닌 단일 비밀값(일부는 마스킹된 표시값, 일부는 식별자 원문)
    const [work24ApiKey, setWork24ApiKey] = useState('');
    const [kakaoRestApiKey, setKakaoRestApiKey] = useState('');
    const [kakaoClientSecret, setKakaoClientSecret] = useState('');
    const [kakaoRedirectUri, setKakaoRedirectUri] = useState('');
    const [sensAccessKey, setSensAccessKey] = useState('');
    const [sensSecretKey, setSensSecretKey] = useState('');
    const [sensServiceId, setSensServiceId] = useState('');
    const [sensSender, setSensSender] = useState('');

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

                // 외부 연동 — 비밀값 5종은 마스킹된 표시값(_masked), 식별자/URL 3종은 원문을 그대로 보여준다.
                setWork24ApiKey(data.settings.work24_api_key_masked || '');
                setKakaoRestApiKey(data.settings.kakao_rest_api_key_masked || '');
                setKakaoClientSecret(data.settings.kakao_client_secret_masked || '');
                setKakaoRedirectUri(data.settings.kakao_redirect_uri || '');
                setSensAccessKey(data.settings.sens_access_key_masked || '');
                setSensSecretKey(data.settings.sens_secret_key_masked || '');
                setSensServiceId(data.settings.sens_service_id || '');
                setSensSender(data.settings.sens_sender || '');
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

    /** "외부 연동" 단일 비밀값 저장 — action 없이 PUT { key, value }만 보낸다(기존 route.ts가 이미 지원). */
    const handleSaveSecret = async (settingKey: string, value: string) => {
        try {
            const res = await fetch('/api/admin/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: settingKey, value }),
            });
            const data = await res.json();
            if (data.success) {
                await fetchSettings();
            } else {
                alert(data.error || '저장 중 오류가 발생했습니다.');
            }
        } catch (error) {
            logger.error('Secret save error:', error);
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

                <div className="bg-[var(--color-bg-elevated)] rounded-[4px] border border-[var(--color-border)] overflow-hidden mb-8">
                    <div className="p-6 border-b border-[var(--color-border)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <div className="flex items-center gap-2 text-[var(--color-text)] font-bold text-lg mb-1">
                                <Plug className="text-[var(--color-accent)]" size={22} />
                                외부 연동
                            </div>
                            <p className="text-[var(--color-text-muted)] text-sm">
                                고용24·카카오 로그인·네이버 클라우드 SENS 연동에 쓰는 값입니다. 새 값을 입력하고 저장하면 이전 값을 덮어쓰며,
                                비밀값은 조회 시 원문이 노출되지 않습니다.
                            </p>
                        </div>
                        <Link
                            href="/admin/settings/api-keys/guide"
                            className="h-11 px-4 inline-flex items-center gap-2 text-sm font-medium rounded-[4px] border border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent-soft)] transition-colors whitespace-nowrap"
                        >
                            <BookOpen size={16} />
                            등록 방법 보기
                        </Link>
                    </div>
                    <div className="p-6 divide-y divide-[var(--color-border)]">
                        <SecretField label="고용24 인증키" settingKey="work24_api_key" maskedValue={work24ApiKey} onSave={handleSaveSecret} />
                        <SecretField label="카카오 REST API 키" settingKey="kakao_rest_api_key" maskedValue={kakaoRestApiKey} onSave={handleSaveSecret} />
                        <SecretField label="카카오 Client Secret" settingKey="kakao_client_secret" maskedValue={kakaoClientSecret} onSave={handleSaveSecret} />
                        <SecretField label="카카오 Redirect URI" settingKey="kakao_redirect_uri" maskedValue={kakaoRedirectUri} onSave={handleSaveSecret} isSecret={false} />
                        <SecretField label="SENS Access Key" settingKey="sens_access_key" maskedValue={sensAccessKey} onSave={handleSaveSecret} />
                        <SecretField label="SENS Secret Key" settingKey="sens_secret_key" maskedValue={sensSecretKey} onSave={handleSaveSecret} />
                        <SecretField label="SENS Service ID" settingKey="sens_service_id" maskedValue={sensServiceId} onSave={handleSaveSecret} isSecret={false} />
                        <SecretField label="SENS 발신번호" settingKey="sens_sender" maskedValue={sensSender} onSave={handleSaveSecret} isSecret={false} />
                    </div>
                </div>
            </div>
        </div>
    );
}
