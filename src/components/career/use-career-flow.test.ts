import { describe, expect, it } from 'vitest';
import {
    buildCareerRequestPayload,
    canProceedToItems,
    clearJobRatings,
    COMMON_PAGE_COUNT,
    currentItemPageNumber,
    decideItemsNextAction,
    decidePrevAction,
    hasJobItemsPage,
    hasValidExperience,
    isPageComplete,
    isStarComplete,
    paginateItems,
    toErrorMessage,
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

describe('canProceedToItems', () => {
    it('희망 직무가 비어 있으면 유효한 STAR가 있어도 false(회귀: 희망 직무 미입력 진행 방지)', () => {
        expect(canProceedToItems('', [validStar])).toBe(false);
        expect(canProceedToItems('   ', [validStar])).toBe(false);
    });
    it('희망 직무를 입력하고 유효한 STAR가 있으면 true', () => {
        expect(canProceedToItems('웹 개발자', [validStar])).toBe(true);
    });
    it('희망 직무를 입력해도 유효한 STAR가 없으면 false', () => {
        expect(canProceedToItems('웹 개발자', [emptyStar])).toBe(false);
    });
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

describe('clearJobRatings', () => {
    it('job_* 키만 지우고 공통 문항 점수는 남긴다', () => {
        const ratings = { communication_1: 3, job_1: 2, job_4: 5, learning_2: 4 };
        expect(clearJobRatings(ratings)).toEqual({ communication_1: 3, learning_2: 4 });
    });
    it('희망직무를 바꿔도 이전 맞춤 문항 점수가 새 문항에 이어지지 않는다(재현 시나리오)', () => {
        // 이전 직무(예: 웹 개발자)에서 job_1~4를 전부 응답한 뒤 희망직무를 바꾸면,
        // 새 맞춤 문항도 id가 똑같이 job_1~4이므로 지우지 않으면 "응답 완료"로 오판된다.
        const staleRatings = Object.fromEntries([
            ...COMMON_ITEMS.map(i => [i.id, 3]),
            ...['job_1', 'job_2', 'job_3', 'job_4'].map(id => [id, 5]),
        ]);
        const cleared = clearJobRatings(staleRatings);
        const newJobItems: JobItem[] = [{ ...jobItem, id: 'job_1' }];
        expect(isPageComplete(newJobItems, cleared)).toBe(false);
    });
    it('job_로 시작하지 않으면 그대로 둔다', () => expect(clearJobRatings({})).toEqual({}));
});

describe('decideItemsNextAction', () => {
    it('마지막 공통 페이지 전이면 다음 공통 페이지로', () => {
        expect(decideItemsNextAction(0, 'idle', [])).toBe('advanceCommonPage');
        expect(decideItemsNextAction(COMMON_PAGE_COUNT - 2, 'ready', [])).toBe('advanceCommonPage');
    });
    it('마지막 공통 페이지에서 맞춤 문항 요청이 아직 진행 중이면 기다린다', () => {
        expect(decideItemsNextAction(COMMON_PAGE_COUNT - 1, 'loading', [])).toBe('waitForJobItems');
    });
    it('마지막 공통 페이지에서 맞춤 문항이 있으면 그 페이지로', () => {
        expect(decideItemsNextAction(COMMON_PAGE_COUNT - 1, 'ready', [jobItem])).toBe('goToJobItems');
    });
    it('마지막 공통 페이지에서 맞춤 문항이 없으면 바로 제출', () => {
        expect(decideItemsNextAction(COMMON_PAGE_COUNT - 1, 'ready', [])).toBe('submit');
        expect(decideItemsNextAction(COMMON_PAGE_COUNT - 1, 'idle', [])).toBe('submit');
    });
});

describe('decidePrevAction', () => {
    it('맞춤 문항 단계에서는 공통 문항 단계로', () => expect(decidePrevAction('jobItems', 0)).toBe('backToItemsStep'));
    it('공통 문항 첫 페이지가 아니면 이전 페이지로', () => expect(decidePrevAction('items', 2)).toBe('decrementCommonPage'));
    it('공통 문항 첫 페이지면 입력 단계로', () => expect(decidePrevAction('items', 0)).toBe('backToInput'));
});

describe('buildCareerRequestPayload', () => {
    const base = {
        desiredJob: '웹 개발자',
        experiences: [emptyStar, validStar],
        strengthNote: '꼼꼼함',
        itemRatings: Object.fromEntries(COMMON_ITEMS.map(i => [i.id, 3])),
        jobItems: [],
    };
    it('완성되지 않은 STAR는 제외하고 유효한 바디를 만든다', () => {
        const body = buildCareerRequestPayload(base);
        expect(body.experiences).toEqual([validStar]);
        expect(body.desiredJob).toBe('웹 개발자');
    });
    it('공통 문항 응답이 빠지면 사람이 읽을 수 있는 문구로 예외를 던진다(회귀: ZodError JSON 노출 방지)', () => {
        const rest = { ...base.itemRatings };
        delete rest[COMMON_ITEMS[0].id];
        try {
            buildCareerRequestPayload({ ...base, itemRatings: rest });
            expect.unreachable();
        } catch (err) {
            expect(err).toBeInstanceOf(Error);
            const message = (err as Error).message;
            expect(message).toBe('모든 공통 문항에 응답해주세요.');
            expect(message.trim().startsWith('{')).toBe(false);
            expect(message.trim().startsWith('[')).toBe(false);
        }
    });
});

describe('toErrorMessage', () => {
    it('메시지 있는 Error는 그 메시지를 쓴다', () => expect(toErrorMessage(new Error('실패 이유'))).toBe('실패 이유'));
    it('메시지 없는 Error·비 Error 값은 기본 문구를 쓴다', () => {
        expect(toErrorMessage(new Error(''))).toBe('잠시 후 다시 시도해 주세요.');
        expect(toErrorMessage('문자열')).toBe('잠시 후 다시 시도해 주세요.');
        expect(toErrorMessage(undefined, '다른 기본값')).toBe('다른 기본값');
    });
});
