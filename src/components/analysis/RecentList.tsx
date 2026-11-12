/** 비로그인 사용자의 이 기기 최근 조회 목록(library/page.tsx 하위) — 삭제 없이 보기만 제공한다. */
import ReportRow, { type ReportRowItem } from './ReportRow';

interface RecentListProps {
    items: ReportRowItem[];
}

export default function RecentList({ items }: RecentListProps) {
    if (items.length === 0) return <p className="text-sm text-text-muted">최근 본 리포트가 없습니다.</p>;
    return (
        <ul className="space-y-2">
            {items.map((item) => <ReportRow key={item.publicId} item={item} />)}
        </ul>
    );
}
