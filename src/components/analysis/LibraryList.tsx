/** 로그인 사용자의 서버 보관함 목록(library/page.tsx 하위) — 비어 있으면 안내 문구만 보여준다. */
import ReportRow, { type ReportRowItem } from './ReportRow';

interface LibraryListProps {
    items: ReportRowItem[];
    busy: boolean;
    onRemove: (publicId: string) => void;
}

export default function LibraryList({ items, busy, onRemove }: LibraryListProps) {
    if (items.length === 0) return <p className="text-sm text-text-muted">보관함이 비어 있습니다.</p>;
    return (
        <ul className="space-y-2">
            {items.map((item) => <ReportRow key={item.publicId} item={item} busy={busy} onRemove={onRemove} />)}
        </ul>
    );
}
