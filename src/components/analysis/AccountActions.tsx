'use client';

/** 로그인 사용자 전용 하단 액션(library/page.tsx 하위) — 로그아웃 / 탈퇴(보관함 포함 삭제). */
interface AccountActionsProps {
    busy: boolean;
    onLogout: () => void;
    onWithdraw: () => void;
}

const rowButton = 'h-11 px-3 rounded-[var(--radius-default)] text-sm font-medium border border-border text-text-secondary hover:border-accent hover:text-accent';

export default function AccountActions({ busy, onLogout, onWithdraw }: AccountActionsProps) {
    return (
        <div className="pt-4 border-t border-border flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={onLogout} className={rowButton}>로그아웃</button>
            <button type="button" disabled={busy} onClick={onWithdraw} className={`${rowButton} border-danger text-danger hover:border-danger-hover hover:text-danger-hover`}>탈퇴(보관함 포함 삭제)</button>
        </div>
    );
}
