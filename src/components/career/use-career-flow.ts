/**
 * `/career` 화면 상태 머신 — STAR 입력 → 공통 16문항(4페이지) → 맞춤 4문항(1페이지, 없으면 건너뜀) → 결과.
 * 페이지 전환·STAR 유효성 등 분기 로직은 아래 순수 함수로 뺀다(테스트: use-career-flow.test.ts).
 */
import { useRef, useState } from 'react';
import { careerRequestSchema, starSchema, type CareerResult, type CompetencyKey, type JobItem, type Star } from '@/lib/career/schema';
import { COMMON_ITEMS, ITEMS_PER_PAGE, type CareerItem } from '@/lib/career/items';

export type CareerStep = 'input' | 'items' | 'jobItems' | 'loading' | 'result';

export const EMPTY_STAR: Star = { situation: '', task: '', action: '', result: '' };
export const MAX_EXPERIENCES = 2;
export const COMMON_PAGE_COUNT = Math.ceil(COMMON_ITEMS.length / ITEMS_PER_PAGE);

/** STAR 한 건의 4칸이 모두 글자 수 기준(20~200자)을 만족하는지. */
export function isStarComplete(star: Star): boolean {
    return starSchema.safeParse(star).success;
}

/** 경험 중 유효한 STAR가 1개 이상 있는지 — "다음: 역량 체크" 버튼 활성 조건. */
export function hasValidExperience(experiences: readonly Star[]): boolean {
    return experiences.some(isStarComplete);
}

/** 문항 목록에서 page(0부터)에 해당하는 4개를 자른다. */
export function paginateItems(items: readonly CareerItem[], page: number): CareerItem[] {
    return items.slice(page * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE + ITEMS_PER_PAGE);
}

/** 해당 페이지의 문항 전부에 응답이 있는지 — "다음" 활성 조건. */
export function isPageComplete(pageItems: readonly CareerItem[], ratings: Record<string, number>): boolean {
    return pageItems.length > 0 && pageItems.every(item => typeof ratings[item.id] === 'number');
}

/** 공통 문항 뒤 맞춤 문항 페이지가 있는지(맞춤 문항 생성 성공 여부). */
export function hasJobItemsPage(jobItems: readonly JobItem[]): boolean {
    return jobItems.length > 0;
}

/** 문항 단계 전체 페이지 수(공통 4 + 맞춤 0or1). 진행률 "n/총" 표시에 쓴다. */
export function totalItemPages(jobItems: readonly JobItem[]): number {
    return COMMON_PAGE_COUNT + (hasJobItemsPage(jobItems) ? 1 : 0);
}

/** 현재 보고 있는 페이지의 1부터 시작하는 전체 순번("3/5"의 3). */
export function currentItemPageNumber(step: CareerStep, commonPage: number): number {
    return step === 'jobItems' ? COMMON_PAGE_COUNT + 1 : commonPage + 1;
}

interface UseCareerFlowResult {
    step: CareerStep;
    desiredJob: string;
    setDesiredJob: (v: string) => void;
    experiences: Star[];
    setExperience: (index: number, star: Star) => void;
    addExperience: () => void;
    removeExperience: (index: number) => void;
    strengthNote: string;
    setStrengthNote: (v: string) => void;
    itemRatings: Record<string, number>;
    rateItem: (id: string, value: number) => void;
    jobItems: JobItem[];
    commonPage: number;
    pageItems: CareerItem[];
    progress: { current: number; total: number };
    canProceedPage: boolean;
    result: CareerResult | null;
    competencyScores: Record<CompetencyKey, number> | null;
    error: string;
    goToItems: () => void;
    nextPage: () => void;
    prevPage: () => void;
}

/**
 * `/career` 화면 상태와 전환 핸들러를 묶은 훅. 분기 판단은 위 순수 함수에 맡기고 상태만 갈아 끼운다.
 */
export function useCareerFlow(): UseCareerFlowResult {
    const [step, setStep] = useState<CareerStep>('input');
    const [desiredJob, setDesiredJob] = useState('');
    const [experiences, setExperiences] = useState<Star[]>([{ ...EMPTY_STAR }]);
    const [strengthNote, setStrengthNote] = useState('');
    const [itemRatings, setItemRatings] = useState<Record<string, number>>({});
    const [jobItems, setJobItems] = useState<JobItem[]>([]);
    const [commonPage, setCommonPage] = useState(0);
    const [result, setResult] = useState<CareerResult | null>(null);
    const [competencyScores, setCompetencyScores] = useState<Record<CompetencyKey, number> | null>(null);
    const [error, setError] = useState('');
    // 버튼 연속 클릭 등으로 submit()이 중복 실행되는 것을 막는 즉시 체크용 플래그
    const inFlightRef = useRef(false);

    function setExperience(index: number, star: Star) {
        setExperiences(prev => prev.map((e, i) => (i === index ? star : e)));
    }

    function addExperience() {
        setExperiences(prev => (prev.length >= MAX_EXPERIENCES ? prev : [...prev, { ...EMPTY_STAR }]));
    }

    function removeExperience(index: number) {
        setExperiences(prev => prev.filter((_, i) => i !== index));
    }

    function rateItem(id: string, value: number) {
        setItemRatings(prev => ({ ...prev, [id]: value }));
    }

    /** 희망직무 맞춤 문항을 백그라운드로 요청한다. 실패해도 그냥 진행(맞춤 문항 없이). */
    async function requestJobItems() {
        try {
            const res = await fetch('/api/career/items', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ desiredJob }),
            });
            const data = await res.json();
            setJobItems(res.ok && Array.isArray(data.items) ? data.items : []);
        } catch {
            setJobItems([]);
        }
    }

    function goToItems() {
        void requestJobItems();
        setCommonPage(0);
        setStep('items');
    }

    async function submit() {
        if (inFlightRef.current) return;
        inFlightRef.current = true;
        setStep('loading');
        setError('');
        try {
            const body = careerRequestSchema.parse({
                desiredJob,
                experiences: experiences.filter(isStarComplete),
                strengthNote,
                itemRatings,
                jobItems,
            });
            const res = await fetch('/api/career', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setResult(data.result);
            setCompetencyScores(data.scores);
            setStep('result');
        } catch (err) {
            setError(err instanceof Error && err.message ? err.message : '잠시 후 다시 시도해 주세요.');
            setStep(hasJobItemsPage(jobItems) ? 'jobItems' : 'items');
        } finally {
            inFlightRef.current = false;
        }
    }

    function nextPage() {
        if (step === 'items') {
            if (commonPage < COMMON_PAGE_COUNT - 1) {
                setCommonPage(p => p + 1);
                return;
            }
            if (hasJobItemsPage(jobItems)) {
                setStep('jobItems');
                return;
            }
            void submit();
            return;
        }
        if (step === 'jobItems') void submit();
    }

    function prevPage() {
        if (step === 'jobItems') {
            setStep('items');
            return;
        }
        if (step === 'items') {
            if (commonPage > 0) setCommonPage(p => p - 1);
            else setStep('input');
        }
    }

    const pageItems = step === 'jobItems' ? jobItems : paginateItems(COMMON_ITEMS, commonPage);
    const progress = { current: currentItemPageNumber(step, commonPage), total: totalItemPages(jobItems) };
    const canProceedPage = isPageComplete(pageItems, itemRatings);

    return {
        step, desiredJob, setDesiredJob,
        experiences, setExperience, addExperience, removeExperience,
        strengthNote, setStrengthNote,
        itemRatings, rateItem,
        jobItems, commonPage, pageItems, progress, canProceedPage,
        result, competencyScores, error,
        goToItems, nextPage, prevPage,
    };
}
