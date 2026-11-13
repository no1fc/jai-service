'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

/**
 * 상담 신청 폼을 네이티브 <dialog> 모달로 표시한다.
 * showModal()/close()로 포커스 트랩·Esc 닫힘을 브라우저 기본 동작에 위임한다.
 */
export default function LeadModal({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
    const ref = useRef<HTMLDialogElement>(null);
    useEffect(() => {
        const d = ref.current;
        if (!d) return;
        if (open && !d.open) d.showModal();
        if (!open && d.open) d.close();
    }, [open]);
    return (
        <dialog ref={ref} onClose={onClose} aria-labelledby="lead-modal-title"
            className="m-auto w-[min(100%-2rem,36rem)] rounded-[var(--radius-card)] border border-border bg-bg p-0 backdrop:bg-black/40">
            <div className="flex items-center justify-between px-5 pt-4">
                <h2 id="lead-modal-title" className="font-bold text-text">무료 1:1 상담 신청</h2>
                <button type="button" onClick={onClose} aria-label="닫기" className="w-11 h-11 inline-flex items-center justify-center"><X size={20} /></button>
            </div>
            <div className="p-5 max-h-[80dvh] overflow-y-auto">{children}</div>
        </dialog>
    );
}
