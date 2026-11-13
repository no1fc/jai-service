/**
 * 비로그인 사용자의 "최근 본 분석" 보관 — localStorage. 시크릿 모드 등에서 접근이
 * 예외를 던질 수 있으므로 모든 접근을 try/catch로 감싼다(`/analysis/library` Task 9에서도 재사용).
 */
import type { AnalysisRequest } from '@/lib/analysis/schema';

export const RECENT_KEY = 'jai.analysis.recent';
export const MAX_RECENT = 20;

export interface RecentItem {
    publicId: string;
    type: AnalysisRequest['type'];
    keyword: string;
    createdAt: string;
}

function safeStorage(): Storage | null {
    try {
        return globalThis.localStorage ?? null;
    } catch {
        return null;
    }
}

/** 저장된 최근 조회 목록. 접근·파싱 실패 시 빈 배열을 반환한다. */
export function readRecent(): RecentItem[] {
    const storage = safeStorage();
    if (!storage) return [];
    try {
        const raw = storage.getItem(RECENT_KEY);
        if (!raw) return [];
        const parsed: unknown = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as RecentItem[]) : [];
    } catch {
        return [];
    }
}

function writeRecent(items: RecentItem[]): void {
    try {
        safeStorage()?.setItem(RECENT_KEY, JSON.stringify(items));
    } catch {
        // 저장 실패는 조용히 무시한다(보관함 기능 저하일 뿐 전체 흐름을 막지 않음)
    }
}

/** 같은 publicId는 제거 후 맨 앞에 재삽입, 최대 MAX_RECENT개로 자른다. 기존 배열은 변경하지 않는다. */
export function pushRecent(item: RecentItem): RecentItem[] {
    const next = [item, ...readRecent().filter(r => r.publicId !== item.publicId)].slice(0, MAX_RECENT);
    writeRecent(next);
    return next;
}

/** 특정 publicId를 제거한다(불변). */
export function removeRecent(publicId: string): RecentItem[] {
    const next = readRecent().filter(r => r.publicId !== publicId);
    writeRecent(next);
    return next;
}
