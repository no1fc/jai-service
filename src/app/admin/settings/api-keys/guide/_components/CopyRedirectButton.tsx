'use client';

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

/** Redirect URI를 클립보드로 복사하는 버튼. 성공/실패를 `aria-live`로 알린다. */
export function CopyRedirectButton({ value }: { value: string }) {
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setError(false);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            setError(true);
            setCopied(false);
        }
    };

    return (
        <div className="flex items-center gap-2">
            <button
                type="button"
                onClick={handleCopy}
                className="h-11 px-4 inline-flex items-center gap-2 text-sm font-medium rounded-[4px] bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] transition-colors"
            >
                <Copy size={16} />
                Redirect URI 복사
            </button>
            <span className="text-sm font-medium text-[var(--color-success)] min-w-16" aria-live="polite">
                {copied && (
                    <span className="inline-flex items-center gap-1">
                        <Check size={14} /> 복사됨
                    </span>
                )}
                {error && <span className="text-[var(--color-danger)]">복사 실패</span>}
            </span>
        </div>
    );
}
