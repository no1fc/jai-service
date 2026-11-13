/** 보관함/최근 조회 공용 한 줄 — 유형 배지·키워드·생성일·보기(+선택적 삭제). LibraryList·RecentList가 공용으로 쓴다. */
import Link from 'next/link';
import { ANALYSIS_TYPE_LABEL, type AnalysisRequest } from '@/lib/analysis/schema';

export interface ReportRowItem { publicId: string; type: AnalysisRequest['type']; keyword: string; createdAt: string }

interface ReportRowProps {
    item: ReportRowItem;
    busy?: boolean;
    onRemove?: (publicId: string) => void;
}

const card = 'rounded-[var(--radius-card)] border border-border bg-bg-elevated p-4';
const rowButton = 'h-11 px-3 rounded-[var(--radius-default)] text-sm font-medium border border-border text-text-secondary hover:border-accent hover:text-accent';

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function ReportRow({ item, busy, onRemove }: ReportRowProps) {
    return (
        <li className={`${card} flex flex-wrap items-center gap-3`}>
            <span className="inline-flex items-center h-6 px-2 rounded-full bg-accent-soft text-accent text-xs font-semibold">{ANALYSIS_TYPE_LABEL[item.type]}</span>
            <span className="flex-1 min-w-0 truncate text-text font-medium">{item.keyword}</span>
            <span className="text-xs text-text-muted">{formatDate(item.createdAt)}</span>
            <Link href={`/analysis/r/${item.publicId}`} className={rowButton}>보기</Link>
            {onRemove && <button type="button" disabled={busy} onClick={() => onRemove(item.publicId)} className={rowButton}>삭제</button>}
        </li>
    );
}
