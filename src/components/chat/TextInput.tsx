'use client';

import { useState, KeyboardEvent, ChangeEvent } from 'react';
import { Send, X, CornerDownLeft } from 'lucide-react';

interface TextInputProps {
    onSubmit: (text: string) => void;
    onCancel?: () => void;
    placeholder?: string;
    disabled?: boolean;
    inputMode?: 'text' | 'numeric';
}

export default function TextInput({ onSubmit, onCancel, placeholder, disabled, inputMode }: TextInputProps) {
    const [text, setText] = useState('');

    const handleSubmit = () => {
        const trimmed = text.trim();
        if (trimmed && !disabled) {
            onSubmit(trimmed);
            setText('');
        }
    };

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.value.length <= 500) {
            setText(e.target.value);
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const canSubmit = text.trim().length > 0 && !disabled;

    return (
        <div className="w-full flex flex-col gap-2">
            <div className={`relative flex items-center transition-colors ${disabled ? 'opacity-50' : ''}`}>
                <input
                    type="text"
                    inputMode={inputMode}
                    value={text}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder || '메시지를 입력하세요...'}
                    disabled={disabled}
                    className="w-full bg-bg-elevated border border-[rgba(15,0,0,0.12)] rounded-[6px] px-6 py-4 md:py-6 pr-36 text-base md:text-lg text-text focus:outline-none focus:border-accent transition-colors placeholder:text-text-muted"
                />

                <div className="absolute right-3 flex items-center gap-2">
                    {onCancel && (
                        <button
                            onClick={onCancel}
                            disabled={disabled}
                            className="w-10 h-10 md:w-12 md:h-12 rounded-[4px] flex items-center justify-center text-text-muted hover:text-text-secondary transition-colors"
                            aria-label="취소"
                        >
                            <X size={20} />
                        </button>
                    )}
                    <button
                        onClick={handleSubmit}
                        disabled={!canSubmit || disabled}
                        className={`w-10 h-10 md:w-12 md:h-12 rounded-[4px] flex items-center justify-center transition-colors ${canSubmit ? 'bg-bg border border-[rgba(15,0,0,0.12)] text-text hover:text-accent-hover' : 'bg-bg-elevated text-text-muted'}`}
                        aria-label="전송"
                    >
                        <Send size={18} fill={canSubmit ? 'currentColor' : 'none'} />
                    </button>
                    <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-[4px] bg-bg-elevated border border-[rgba(15,0,0,0.12)] ml-1">
                        <CornerDownLeft size={10} className="text-text-muted" />
                        <span className="text-[9px] font-black text-text-muted tracking-tighter">ENTER</span>
                    </div>
                </div>
            </div>
            <div className="flex justify-end px-2">
                <span className={`text-[9px] font-black tracking-widest uppercase transition-colors ${text.length > 450 ? 'text-danger' : 'text-text-muted'}`}>
                    {text.length} / 500
                </span>
            </div>
        </div>
    );
}
