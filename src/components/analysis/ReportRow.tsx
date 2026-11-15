/** 보관함/최근 조회 공용 한 줄 — 유형 배지·키워드·생성일·보기(+선택적 삭제). LibraryList·RecentList가 공용으로 쓴다. */
import Link from 'next/link';
import { kindBadgeLabel } from '@/lib/analysis/labels';
import { ANALYSIS_TYPE_LABEL, type AnalysisRequest, type ReportKind } from '@/lib/analysis/schema';

/** kind는 과거(이 변경 전) 로컬에 저장된 최근 조회 항목에는 없을 수 있어 선택값이다. */
export interface ReportRowItem { publicId: string; type: AnalysisRequest['type']; keyword: string; createdAt: string; kind?: ReportKind }

interface ReportRowProps {
    item: ReportRowItem;
    busy?: boolean;
    onRemove?: (publicId: string) => void;
}

const card = 'rounded-[var(--radius-card)] border border-border bg-bg-elevated p-4';
const rowButton = 'h-11 px-3 inline-flex items-center rounded-[var(--radius-default)] text-sm font-medium border border-border text-text-secondary hover:border-accent hover:text-accent';

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function ReportRow({ item, busy, onRemove }: ReportRowProps) {
    const kindLabel = item.kind ? kindBadgeLabel(item.kind) : null;
    return (
        <li className={`${card} flex flex-wrap items-center gap-3`}>
            <span className="inline-flex items-center h-6 px-2 rounded-full bg-accent-soft text-accent text-xs font-semibold">{ANALYSIS_TYPE_LABEL[item.type]}</span>
            {kindLabel && (
                <span className="inline-flex items-center h-6 px-2 rounded-full bg-bg text-text-secondary text-xs font-semibold border border-border">{kindLabel}</span>
            )}
            <span className="flex-1 min-w-0 truncate text-text font-medium">{item.keyword}</span>
            <span className="text-xs text-text-muted">{formatDate(item.createdAt)}</span>
            <Link href={`/analysis/r/${item.publicId}`} className={rowButton}>보기</Link>
            {onRemove && <button type="button" disabled={busy} onClick={() => onRemove(item.publicId)} className={rowButton}>삭제</button>}
        </li>
    );
}
