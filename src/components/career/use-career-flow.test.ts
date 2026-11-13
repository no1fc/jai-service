import { describe, expect, it } from 'vitest';
import {
    COMMON_PAGE_COUNT,
    currentItemPageNumber,
    hasJobItemsPage,
    hasValidExperience,
    isPageComplete,
    isStarComplete,
    paginateItems,
    totalItemPages,
} from './use-career-flow';
import { COMMON_ITEMS } from '@/lib/career/items';
import type { JobItem, Star } from '@/lib/career/schema';

const validStar: Star = {
    situation: '매장에서 재고 관리가 엉켜 주문이 자주 누락되는 상황이었다.',
    task: '재고 기록 방식을 바꿔 누락률을 낮추는 과제를 맡았다.',
    action: '매일 마감 시 실물과 전산 수량을 대조해 차이를 기록했다.',
    result: '한 달 뒤 주문 누락이 눈에 띄게 줄어 동료들도 방식을 따라했다.',
};
const emptyStar: Star = { situation: '', task: '', action: '', result: '' };

const jobItem: JobItem = { id: 'job_1', competency: 'communication', text: '맞춤 문항 텍스트를 20자 이상으로 채운다' };

describe('isStarComplete / hasValidExperience', () => {
    it('4칸이 모두 20~200자면 유효하다', () => expect(isStarComplete(validStar)).toBe(true));
    it('빈 STAR는 유효하지 않다', () => expect(isStarComplete(emptyStar)).toBe(false));
    it('경험 중 하나라도 유효하면 true', () => expect(hasValidExperience([emptyStar, validStar])).toBe(true));
    it('모두 무효하면 false', () => expect(hasValidExperience([emptyStar])).toBe(false));
});

describe('paginateItems', () => {
    it('페이지당 4개씩 자른다', () => {
        expect(paginateItems(COMMON_ITEMS, 0)).toHaveLength(4);
        expect(paginateItems(COMMON_ITEMS, 0)[0]).toBe(COMMON_ITEMS[0]);
        expect(paginateItems(COMMON_ITEMS, 1)[0]).toBe(COMMON_ITEMS[4]);
    });
    it('마지막 페이지(3)도 4개다', () => expect(paginateItems(COMMON_ITEMS, 3)).toHaveLength(4));
});

describe('isPageComplete', () => {
    const pageItems = paginateItems(COMMON_ITEMS, 0);
    it('전부 응답했으면 true', () => {
        const ratings = Object.fromEntries(pageItems.map(i => [i.id, 3]));
        expect(isPageComplete(pageItems, ratings)).toBe(true);
    });
    it('하나라도 빠지면 false', () => {
        const ratings = Object.fromEntries(pageItems.slice(1).map(i => [i.id, 3]));
        expect(isPageComplete(pageItems, ratings)).toBe(false);
    });
    it('문항이 없으면 false(빈 페이지로 넘어가지 않도록)', () => expect(isPageComplete([], {})).toBe(false));
});

describe('hasJobItemsPage / totalItemPages / currentItemPageNumber', () => {
    it('맞춤 문항이 없으면 페이지가 없고 총 4페이지', () => {
        expect(hasJobItemsPage([])).toBe(false);
        expect(totalItemPages([])).toBe(COMMON_PAGE_COUNT);
    });
    it('맞춤 문항이 있으면 총 5페이지', () => {
        expect(hasJobItemsPage([jobItem])).toBe(true);
        expect(totalItemPages([jobItem])).toBe(COMMON_PAGE_COUNT + 1);
    });
    it('공통 문항 단계의 순번은 commonPage+1', () => expect(currentItemPageNumber('items', 2)).toBe(3));
    it('맞춤 문항 단계의 순번은 공통 페이지 수+1', () => expect(currentItemPageNumber('jobItems', 0)).toBe(COMMON_PAGE_COUNT + 1));
});
