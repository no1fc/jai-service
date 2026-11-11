'use client';

import React, { useState, useEffect } from 'react';
import { Bot, Loader2, Save, LayoutTemplate, MessageSquare, Database, Plus, Trash2, Edit2, AlertCircle } from 'lucide-react';
import { logger } from '@/lib/logger';

type PromptCategoryType = 'text' | 'json' | 'json_list';

interface PromptCategory {
    key: string;
    label: string;
    isFixed: boolean;
    type: PromptCategoryType;
}

// 질문 시나리오를 위한 타입
interface Choice {
    id: string;
    label: string;
    value: string;
    isOther?: boolean;
}

interface Question {
    id: string;
    message: string;
    type?: string;
    choices: Choice[];
}

export default function PromptsSettingsPage() {
    // 메타데이터
    const [categories, setCategories] = useState<PromptCategory[]>([]);
    const [activeTab, setActiveTab] = useState<string>('system_prompt');

    // 설정 값
    const [settingsData, setSettingsData] = useState<Record<string, string>>({});

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // 새 카테고리 모달 관련
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newCatKey, setNewCatKey] = useState('');
    const [newCatLabel, setNewCatLabel] = useState('');

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/settings');
            const data = await res.json();
            if (data.success && data.settings && data.promptCategories) {
                setCategories(data.promptCategories);

                // 현재 activeTab이 로드된 카테고리 목록에 없으면(예: 삭제된 'system_prompt')
                // 첫 번째 카테고리로 이동한다. 그대로 두면 에디터 패널이 비어 보인다.
                // (setState 콜백 형태로 최신 activeTab을 읽어 effect의 의존성 배열에 추가하지 않아도 된다.)
                setActiveTab(current =>
                    data.promptCategories.some((cat: PromptCategory) => cat.key === current)
                        ? current
                        : (data.promptCategories[0]?.key ?? '')
                );

                // 설정 데이터 매핑
                const newSettings: Record<string, string> = {};
                data.promptCategories.forEach((cat: PromptCategory) => {
                    newSettings[cat.key] = data.settings[cat.key] || '';
                });
                setSettingsData(newSettings);
            }
        } catch (error) {
            logger.error('Failed to fetch settings:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // 카테고리 정보와 그에 속한 데이터를 한 번에 서버로 넘기기
    const saveCategoryMetaAndData = async (newCats: PromptCategory[]) => {
        setIsSaving(true);
        try {
            // 카테고리 저장
            await fetch('/api/admin/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: 'prompt_categories', value: JSON.stringify(newCats) })
            });
            setCategories(newCats);
        } catch (e) {
            logger.error('카테고리 수정 중 에러:', e);
            alert('카테고리 수정 중 에러가 발생했습니다.');
        } finally {
            setIsSaving(false);
        }
    }

    const handleAddCategory = () => {
        if (!newCatKey.trim() || !newCatLabel.trim()) return alert('모든 필드를 입력하세요.');
        // 영어 소문자와 언더스코어만 허용 (key)
        if (!/^[a-z_]+$/.test(newCatKey)) return alert('키는 영어 소문자와 언더스코어(_)만 사용 가능합니다.');
        if (categories.find(c => c.key === newCatKey)) return alert('이미 존재하는 키입니다.');

        const newCats = [...categories, {
            key: newCatKey,
            label: newCatLabel,
            isFixed: false,
            type: 'text' as const
        }];

        setSettingsData(prev => ({ ...prev, [newCatKey]: '' }));
        saveCategoryMetaAndData(newCats);
        setIsAddModalOpen(false);
        setNewCatKey('');
        setNewCatLabel('');
    };

    const handleDeleteCategory = (catKey: string) => {
        if (!confirm('정말 이 항목을 삭제하시겠습니까? (이 설정값도 함께 초기화됩니다)')) return;
        const newCats = categories.filter(c => c.key !== catKey);

        // 화면 포커스가 지워진 탭에 있었다면 1번째로 이동
        if (activeTab === catKey) setActiveTab(categories[0].key);

        saveCategoryMetaAndData(newCats);
    };

    const handleSaveCurrentTab = async () => {
        setIsSaving(true);
        try {
            const targetValue = settingsData[activeTab];
            const activeCat = categories.find(c => c.key === activeTab);

            // JSON 탭들의 경우 유효성 검사
            if (activeCat?.type === 'json' || activeCat?.type === 'json_list') {
                if (targetValue && targetValue.trim() !== '') {
                    try {
                        JSON.parse(targetValue);
                    } catch (e) {
                        alert('유효하지 않은 JSON 형식입니다. 저장하기 전에 다시 확인해주세요.');
                        setIsSaving(false);
                        return;
                    }
                }
            }

            const res = await fetch('/api/admin/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: activeTab, value: targetValue })
            });
            const data = await res.json();

            if (data.success) {
                alert('프롬프트 변경사항이 성공적으로 업데이트되었습니다.');
            } else {
                alert(data.error || '저장 중 오류가 발생했습니다.');
            }
        } catch (error) {
            logger.error('Save error:', error);
            alert('저장 중 네트워크 오류가 발생했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleTextChange = (val: string) => {
        setSettingsData(prev => ({ ...prev, [activeTab]: val }));
    };

    const currentTabInfo = categories.find(t => t.key === activeTab);

    return (
        <div className="max-w-7xl space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-[var(--color-text)]">프롬프트 및 시나리오 관리</h1>
                <p className="text-[var(--color-text-muted)] mt-1">챗봇의 모든 정적 프롬프트, 템플릿, 질문 시나리오를 통합하여 관리하고, 동적으로 항목을 추가할 수 있습니다.</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-200px)] min-h-[700px]">
                {/* 좌측 탭 리스트 */}
                <div className="lg:w-72 flex-shrink-0 bg-[var(--color-bg-elevated)] rounded-[4px] border border-[var(--color-border)] flex flex-col">
                    <div className="bg-[var(--color-bg-elevated)] py-4 px-5 border-b border-[var(--color-border)] flex justify-between items-center">
                        <span className="font-semibold text-[var(--color-text-secondary)]">관리 항목</span>
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="p-1 hover:bg-[var(--color-bg)] rounded-[4px] text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
                            title="새 변수/항목 추가"
                        >
                            <Plus size={18} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto w-full flex flex-col custom-scrollbar py-2">
                        {isLoading ? (
                            <div className="p-4 flex gap-2 text-sm text-[var(--color-text-muted)]"><Loader2 className="animate-spin w-4 h-4" /> 로딩 중...</div>
                        ) : (
                            categories.map((tab) => (
                                <div key={tab.key} className="flex relative group">
                                    <button
                                        onClick={() => setActiveTab(tab.key)}
                                        className={`flex-1 flex items-center gap-3 px-5 py-3 text-left font-medium text-sm transition-colors border-l-4 ${activeTab === tab.key
                                            ? 'border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent)]/10'
                                            : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg)]'
                                            }`}
                                    >
                                        {tab.type === 'json_list' ? <MessageSquare size={16} /> :
                                            tab.type === 'json' ? <LayoutTemplate size={16} /> :
                                                <Bot size={16} />}
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="truncate">{tab.label}</span>
                                            <span className="text-[10px] text-[var(--color-text-muted)] font-normal truncate">_{tab.key}</span>
                                        </div>
                                    </button>

                                    {!tab.isFixed && (
                                        <button
                                            onClick={() => handleDeleteCategory(tab.key)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] opacity-0 group-hover:opacity-100 bg-[var(--color-bg-elevated)] rounded-[4px] border border-[var(--color-border)]"
                                            title="삭제"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* 우측 에디터 영역 */}
                <div className="flex-1 bg-[var(--color-bg-elevated)] rounded-[4px] border border-[var(--color-border)] overflow-hidden flex flex-col min-w-0">
                    {currentTabInfo && (
                        <>
                            <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)] shrink-0 flex justify-between items-center h-16">
                                <div className="flex items-center gap-3">
                                    <span className="font-semibold text-[var(--color-text)] text-lg flex items-center gap-2">
                                        {currentTabInfo.label}
                                    </span>
                                    {currentTabInfo.isFixed ? (
                                        <span className="px-2 py-0.5 bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] text-xs rounded-[4px] whitespace-nowrap border border-[var(--color-border)]">기본 시스템</span>
                                    ) : (
                                        <span className="px-2 py-0.5 bg-[var(--color-accent)]/10 text-[var(--color-accent)] text-xs rounded-[4px] whitespace-nowrap">커스텀 변수</span>
                                    )}
                                </div>
                                <button
                                    onClick={handleSaveCurrentTab}
                                    disabled={isSaving || isLoading}
                                    className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:bg-[var(--color-accent)]/50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-[4px] font-medium transition-colors flex items-center gap-2 text-sm"
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={16} />}
                                    저장
                                </button>
                            </div>

                            <div className="flex-1 p-0 relative bg-[var(--color-bg)] min-h-0 flex flex-col">
                                {isLoading && (
                                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--color-bg-elevated)]/80">
                                        <div className="flex items-center gap-2 text-[var(--color-text-muted)] font-medium">
                                            <Loader2 className="animate-spin w-6 h-6 text-[var(--color-accent)]" />
                                            불러오는 중...
                                        </div>
                                    </div>
                                )}

                                {currentTabInfo.type === 'json_list' ? (
                                    <QuestionsEditor
                                        jsonString={settingsData[activeTab] || ''}
                                        onChange={handleTextChange}
                                    />
                                ) : (
                                    // 일반 텍스트, JSON 에디터
                                    <textarea
                                        value={settingsData[activeTab] || ''}
                                        onChange={(e) => handleTextChange(e.target.value)}
                                        disabled={isLoading || isSaving}
                                        className={`w-full flex-1 p-6 resize-none outline-none font-mono text-sm leading-relaxed text-[var(--color-text)] bg-[var(--color-bg)] focus:ring-2 focus:ring-inset focus:ring-[var(--color-accent)] disabled:bg-[var(--color-bg-elevated)] disabled:text-[var(--color-text-muted)] transition-colors ${currentTabInfo.type === 'json' ? 'whitespace-pre text-[13px]' : ''
                                            }`}
                                        placeholder="내용을 입력하세요. 시스템 기본값이 존재할 경우, 비우면 기본값이 사용됩니다."
                                        spellCheck="false"
                                    />
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* 변수 추가 모달 */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-[rgba(15,0,0,0.5)] flex items-center justify-center z-50">
                    <div className="bg-[var(--color-bg-elevated)] rounded-[4px] w-full max-w-md p-6">
                        <h2 className="text-xl font-bold text-[var(--color-text)] mb-4 flex items-center gap-2">
                            <Plus size={20} className="text-[var(--color-accent)]" />
                            새로운 관리 항목(변수) 추가
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">항목 이름 (Label)</label>
                                <input
                                    type="text"
                                    value={newCatLabel}
                                    onChange={e => setNewCatLabel(e.target.value)}
                                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-[6px] focus:border-[var(--color-accent)] outline-none text-[var(--color-text)] bg-[var(--color-bg-elevated)]"
                                    placeholder="예: 면접 가이드라인"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">고유 키 (Key Identifier)</label>
                                <input
                                    type="text"
                                    value={newCatKey}
                                    onChange={e => setNewCatKey(e.target.value.toLowerCase().replace(/[^a-z_]/g, ''))}
                                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-[6px] focus:border-[var(--color-accent)] outline-none font-mono text-sm text-[var(--color-text)] bg-[var(--color-bg-elevated)]"
                                    placeholder="예: interview_guide (영문 소문자, 띄어쓰기 대신 _ 사용)"
                                />
                                <p className="text-xs text-[var(--color-text-muted)] mt-1">이 키를 사용하여 시스템 프롬프트에서 {"{{"}key{"}}"} 형태로 불러올 수 있습니다.</p>
                            </div>
                        </div>
                        <div className="mt-8 flex gap-3 justify-end">
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                className="px-4 py-2 text-[var(--color-text-secondary)] bg-[var(--color-bg)] hover:bg-[var(--color-bg-elevated)] rounded-[4px] font-medium transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleAddCategory}
                                className="px-4 py-2 text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] rounded-[4px] font-medium transition-colors"
                            >
                                추가하기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ----------------------------------------------------
// 문법 에러를 방지하는 GUI 질문 시나리오 에디터 (Sub-component)
// ----------------------------------------------------
function QuestionsEditor({ jsonString, onChange }: { jsonString: string, onChange: (val: string) => void }) {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [parseError, setParseError] = useState(false);

    useEffect(() => {
        if (!jsonString) {
            setQuestions([]);
            return;
        }
        try {
            const parsed = JSON.parse(jsonString);
            if (Array.isArray(parsed)) {
                setQuestions(parsed);
                setParseError(false);
            } else {
                setParseError(true);
            }
        } catch (e) {
            setParseError(true);
        }
    }, [jsonString]);

    const updateGlobalJson = (newQs: Question[]) => {
        onChange(JSON.stringify(newQs, null, 2));
    };

    const handleAddQuestion = () => {
        const newQs = [...questions, {
            id: 'new_question_' + Date.now(),
            message: '새 질문 내용',
            choices: [{ id: 'opt_1', label: '옵션 1', value: '옵션 1' }],
        }];
        updateGlobalJson(newQs);
        // 즉각 반영
        setQuestions(newQs);
    };

    const handleDeleteQuestion = (idx: number) => {
        const newQs = [...questions];
        newQs.splice(idx, 1);
        updateGlobalJson(newQs);
        setQuestions(newQs);
    };

    const handleQFieldChange = (idx: number, field: keyof Question, val: any) => {
        const newQs = [...questions];
        newQs[idx] = { ...newQs[idx], [field]: val };
        updateGlobalJson(newQs);
        setQuestions(newQs);
    };

    const handleAddChoice = (qIdx: number) => {
        const newQs = [...questions];
        newQs[qIdx].choices.push({ id: `c_${Date.now()}`, label: '새 선택지', value: '새 선택지' });
        updateGlobalJson(newQs);
        setQuestions(newQs);
    };

    const handleDeleteChoice = (qIdx: number, cIdx: number) => {
        const newQs = [...questions];
        newQs[qIdx].choices.splice(cIdx, 1);
        updateGlobalJson(newQs);
        setQuestions(newQs);
    };

    const handleChoiceFieldChange = (qIdx: number, cIdx: number, field: keyof Choice, val: any) => {
        const newQs = [...questions];
        newQs[qIdx].choices[cIdx] = { ...newQs[qIdx].choices[cIdx], [field]: val };
        updateGlobalJson(newQs);
        setQuestions(newQs);
    };

    if (parseError && jsonString) {
        return (
            <div className="p-8 flex items-start gap-3 bg-[var(--color-danger)]/10 text-[var(--color-danger)] h-full">
                <AlertCircle className="shrink-0 mt-0.5" />
                <div>
                    <h3 className="font-bold text-lg mb-2">분석 에러</h3>
                    <p>현재 저장된 데이터가 올바른 질문 시나리오 JSON 배열 형식이 아닙니다.</p>
                    <p className="text-sm mt-4">데이터를 초기화하거나, Raw 에디터에서 원문 코드를 수정해야 합니다.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex-1 overflow-y-auto bg-[var(--color-bg)] p-6 space-y-6">
            <div className="flex justify-between items-center mb-6">
                <p className="text-sm text-[var(--color-text-secondary)] bg-[var(--color-bg-elevated)] p-3 rounded-[4px] border border-[var(--color-border)] w-full">
                    JSON 코드의 괄호, 쌍따옴표 에러로 인한 챗봇 고장을 원천 차단하기 위해 폼 화면으로 제공됩니다.
                    변경 사항은 상단 메뉴의 "저장" 버튼을 눌러야 실제 시스템에 반영됩니다.
                </p>
            </div>

            {questions.map((q, qIdx) => (
                <div key={q.id + '_' + qIdx} className="bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-[4px] p-6 relative group">
                    <button
                        onClick={() => handleDeleteQuestion(qIdx)}
                        className="absolute right-4 top-4 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] p-2 rounded-[4px] hover:bg-[var(--color-danger)]/10 transition"
                        title="이 질문 삭제"
                    >
                        <Trash2 size={18} />
                    </button>

                    <div className="flex items-center gap-3 mb-4">
                        <span className="bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-bold border border-[var(--color-accent)]/20 w-8 h-8 rounded-[4px] flex items-center justify-center text-sm">{qIdx + 1}</span>
                        <h4 className="font-bold text-[var(--color-text)] text-lg">질문 단계 설정</h4>
                    </div>

                    <div className="space-y-5 ml-11">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-[var(--color-text-muted)] mb-1 uppercase tracking-wider">메시지 내용</label>
                                <textarea
                                    value={q.message}
                                    onChange={e => handleQFieldChange(qIdx, 'message', e.target.value)}
                                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-[4px] bg-[var(--color-bg)] text-[var(--color-text)] focus:bg-[var(--color-bg-elevated)] focus:ring-1 focus:ring-[var(--color-accent)] min-h-[80px]"
                                />
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-[var(--color-text-muted)] mb-1 uppercase tracking-wider">고유 ID (영어)</label>
                                    <input
                                        type="text"
                                        value={q.id}
                                        onChange={e => handleQFieldChange(qIdx, 'id', e.target.value)}
                                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-[4px] bg-[var(--color-bg)] text-[var(--color-text)] focus:bg-[var(--color-bg-elevated)] text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-[var(--color-bg)] p-4 border border-[var(--color-border)] rounded-[4px]">
                            <div className="flex justify-between items-center mb-3">
                                <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">선택지 목록 (버튼)</label>
                                <button
                                    onClick={() => handleAddChoice(qIdx)}
                                    className="text-xs bg-[var(--color-bg-elevated)] border border-[var(--color-border)] px-3 py-1 rounded-[4px] hover:bg-[var(--color-accent)]/10 hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]/20 flex items-center gap-1 font-medium transition text-[var(--color-text-secondary)]"
                                >
                                    <Plus size={12} /> 버튼 추가
                                </button>
                            </div>

                            <div className="space-y-2">
                                {q.choices.map((c, cIdx) => (
                                    <div key={c.id + '_' + cIdx} className="flex gap-2 items-center bg-[var(--color-bg-elevated)] p-2 border border-[var(--color-border)] rounded-[4px]">
                                        <div className="flex-col gap-1 w-[20%] min-w-[100px] hidden lg:flex">
                                            <span className="text-[10px] text-[var(--color-text-muted)] px-1">Choice ID</span>
                                            <input
                                                value={c.id}
                                                onChange={e => handleChoiceFieldChange(qIdx, cIdx, 'id', e.target.value)}
                                                className="w-full px-2 py-1.5 border border-[var(--color-border)] text-sm bg-[var(--color-bg)] rounded-[4px] text-[var(--color-text)]"
                                            />
                                        </div>
                                        <div className="flex-col gap-1 w-[35%]">
                                            <span className="text-[10px] text-[var(--color-text-muted)] px-1">화면 표시 버튼 라벨</span>
                                            <input
                                                value={c.label}
                                                onChange={e => handleChoiceFieldChange(qIdx, cIdx, 'label', e.target.value)}
                                                className="w-full px-2 py-1.5 border border-[var(--color-border)] text-sm bg-[var(--color-bg)] rounded-[4px] text-[var(--color-text)]"
                                            />
                                        </div>
                                        <div className="flex-col gap-1 w-[35%]">
                                            <span className="text-[10px] text-[var(--color-text-muted)] px-1">AI 에게 전송될 응답 값</span>
                                            <input
                                                value={c.value}
                                                onChange={e => handleChoiceFieldChange(qIdx, cIdx, 'value', e.target.value)}
                                                className="w-full px-2 py-1.5 border border-[var(--color-border)] text-sm bg-[var(--color-bg)] rounded-[4px] text-[var(--color-text)]"
                                            />
                                        </div>
                                        <div className="flex-col items-center justify-center gap-1 w-[10%]">
                                            <span className="text-[10px] text-[var(--color-text-muted)]">직접입력</span>
                                            <input
                                                type="checkbox"
                                                checked={c.isOther || false}
                                                onChange={e => handleChoiceFieldChange(qIdx, cIdx, 'isOther', e.target.checked)}
                                                className="w-4 h-4 mx-auto rounded-[4px] border-[var(--color-border)]"
                                            />
                                        </div>
                                        <div className="flex flex-col items-center justify-center pl-2">
                                            <span className="text-[10px] text-transparent">del</span>
                                            <button
                                                onClick={() => handleDeleteChoice(qIdx, cIdx)}
                                                className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)] p-1"
                                                title="선택지 삭제"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {q.choices.length === 0 && (
                                    <div className="text-center py-4 text-sm text-[var(--color-text-muted)]">선택지가 없습니다.</div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            ))}

            <div className="flex justify-center mt-6">
                <button
                    onClick={handleAddQuestion}
                    className="bg-[var(--color-bg-elevated)] border-2 border-dashed border-[var(--color-border-strong)] text-[var(--color-text-secondary)] hover:bg-[var(--color-accent)]/10 hover:border-[var(--color-accent)]/30 hover:text-[var(--color-accent)] px-8 py-4 rounded-[4px] font-medium transition flex items-center gap-2"
                >
                    <Plus size={20} /> 새 질문 폼 추가하기
                </button>
            </div>
        </div>
    );
}
