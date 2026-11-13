/**
 * recent-reports.ts 테스트 — localStorage 접근 실패 시 저하, pushRecent 불변·중복 제거·20개 제한.
 */
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { MAX_RECENT, pushRecent, readRecent, removeRecent, type RecentItem } from './recent-reports';

function makeItem(publicId: string): RecentItem {
    return { publicId, type: 'job', keyword: `키워드-${publicId}`, createdAt: new Date().toISOString() };
}

describe('readRecent (localStorage 없음)', () => {
    test('globalThis.localStorage가 미정의면 빈 배열을 반환한다', () => {
        expect(readRecent()).toEqual([]);
    });
});

describe('pushRecent / removeRecent (localStorage 모킹)', () => {
    let store: Record<string, string>;

    beforeEach(() => {
        store = {};
        (globalThis as unknown as { localStorage: Storage }).localStorage = {
            getItem: (key: string) => store[key] ?? null,
            setItem: (key: string, value: string) => { store[key] = value; },
            removeItem: (key: string) => { delete store[key]; },
            clear: () => { store = {}; },
            key: () => null,
            length: 0,
        };
    });

    afterEach(() => {
        delete (globalThis as { localStorage?: Storage }).localStorage;
    });

    test('같은 publicId를 다시 push하면 맨 앞으로 올린다(중복 제거)', () => {
        pushRecent(makeItem('a'));
        pushRecent(makeItem('b'));
        const result = pushRecent(makeItem('a'));
        expect(result.map(r => r.publicId)).toEqual(['a', 'b']);
    });

    test('기존 배열을 변경하지 않고 새 배열을 반환한다(불변)', () => {
        const first = pushRecent(makeItem('a'));
        const second = pushRecent(makeItem('b'));
        expect(first).not.toBe(second);
        expect(first.map(r => r.publicId)).toEqual(['a']);
    });

    test('MAX_RECENT(20)개를 넘지 않는다', () => {
        for (let i = 0; i < 25; i += 1) pushRecent(makeItem(`id-${i}`));
        const result = readRecent();
        expect(result.length).toBe(MAX_RECENT);
        expect(result[0].publicId).toBe('id-24');
    });

    test('removeRecent는 해당 publicId만 제거한다', () => {
        pushRecent(makeItem('a'));
        pushRecent(makeItem('b'));
        const result = removeRecent('a');
        expect(result.map(r => r.publicId)).toEqual(['b']);
    });
});
