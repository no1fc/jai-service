/**
 * `/career` 화면 상태 머신 — STAR 입력 → 공통 16문항(4페이지) → 맞춤 4문항(1페이지, 없으면 건너뜀) → 결과.
 * 페이지 전환·STAR 유효성·제출 요청 구성 등 분기 로직은 아래 순수 함수로 뺀다(테스트: use-career-flow.test.ts).
 */
import { useRef, useState } from 'react';
import { careerRequestSchema, starSchema, type CareerRequest, type CareerResult, type CompetencyKey, type JobItem, type Star } from '@/lib/career/schema';
import { COMMON_ITEMS, ITEMS_PER_PAGE, type CareerItem } from '@/lib/career/items';

export type CareerStep = 'input' | 'items' | 'jobItems' | 'waitingJobItems' | 'loading' | 'result';
export type JobItemsStatus = 'idle' | 'loading' | 'ready';

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

/**
 * 응답에서 맞춤 문항(`job_*`) 점수를 전부 지운다. 맞춤 문항 id는 희망직무와 무관하게 항상
 * `job_1`~`job_4`로 고정되므로, 희망직무를 바꿔 새 맞춤 문항을 요청할 때 지우지 않으면 이전
 * 직무의 점수가 새 문항에 그대로 남아 다시 답하지 않아도 "응답 완료"로 보이게 된다.
 */
export function clearJobRatings(ratings: Record<string, number>): Record<string, number> {
    return Object.fromEntries(Object.entries(ratings).filter(([id]) => !id.startsWith('job_')));
}

export type ItemsNextAction = 'advanceCommonPage' | 'waitForJobItems' | 'goToJobItems' | 'submit';

/** 공통 문항 단계에서 "다음"을 눌렀을 때 할 일을 정한다. */
export function decideItemsNextAction(
    commonPage: number,
    jobItemsStatus: JobItemsStatus,
    jobItems: readonly JobItem[],
): ItemsNextAction {
    if (commonPage < COMMON_PAGE_COUNT - 1) return 'advanceCommonPage';
    if (jobItemsStatus === 'loading') return 'waitForJobItems';
    return hasJobItemsPage(jobItems) ? 'goToJobItems' : 'submit';
}

export type PrevAction = 'backToItemsStep' | 'decrementCommonPage' | 'backToInput';

/** 문항 단계(공통·맞춤)에서 "이전"을 눌렀을 때 할 일을 정한다. */
export function decidePrevAction(step: CareerStep, commonPage: number): PrevAction {
    if (step === 'jobItems') return 'backToItemsStep';
    return commonPage > 0 ? 'decrementCommonPage' : 'backToInput';
}

export type SubmitResult =
    | { ok: true; result: CareerResult; scores: Record<CompetencyKey, number> }
    | { ok: false; message: string };

/** 예외를 사용자에게 보여줄 문구로 바꾼다(메시지 없는 예외·비 Error 값도 안전하게 처리). */
export function toErrorMessage(err: unknown, fallback = '잠시 후 다시 시도해 주세요.'): string {
    return err instanceof Error && err.message ? err.message : fallback;
}

/** `/api/career` 요청 바디를 순수하게 만든다(완성되지 않은 STAR는 제외, 스키마 검증 겸용). */
export function buildCareerRequestPayload(input: {
    desiredJob: string;
    experiences: readonly Star[];
    strengthNote: string;
    itemRatings: Record<string, number>;
    jobItems: readonly JobItem[];
}): CareerRequest {
    return careerRequestSchema.parse({
        desiredJob: input.desiredJob,
        experiences: input.experiences.filter(isStarComplete),
        strengthNote: input.strengthNote,
        itemRatings: input.itemRatings,
        jobItems: input.jobItems,
    });
}

/** 맞춤 문항 API를 호출해 문항 배열을 돌려준다. 실패·빈 응답이면 빈 배열(맞춤 문항 없이 진행). */
async function fetchJobItems(desiredJob: string): Promise<JobItem[]> {
    try {
        const res = await fetch('/api/career/items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ desiredJob }),
        });
        const data = await res.json();
        return res.ok && Array.isArray(data.items) ? data.items : [];
    } catch {
        return [];
    }
}

/** `/api/career`를 호출해 결과를 받는다. 요청 구성·응답 해석은 위 순수 함수에 맡긴다. */
async function submitCareerRequest(input: Parameters<typeof buildCareerRequestPayload>[0]): Promise<SubmitResult> {
    try {
        const body = buildCareerRequestPayload(input);
        const res = await fetch('/api/career', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return { ok: true, result: data.result, scores: data.scores };
    } catch (err) {
        return { ok: false, message: toErrorMessage(err) };
    }
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
 * `/career` 화면 상태와 전환 핸들러를 묶은 훅. 분기 판단·요청 구성은 위 순수 함수에 맡기고
 * 여기서는 그 결과에 따라 상태만 갈아 끼운다.
 */
export function useCareerFlow(): UseCareerFlowResult {
    const [step, setStep] = useState<CareerStep>('input');
    const [desiredJob, setDesiredJob] = useState('');
    const [experiences, setExperiences] = useState<Star[]>([{ ...EMPTY_STAR }]);
    const [strengthNote, setStrengthNote] = useState('');
    const [itemRatings, setItemRatings] = useState<Record<string, number>>({});
    const [jobItems, setJobItems] = useState<JobItem[]>([]);
    const [jobItemsStatus, setJobItemsStatus] = useState<JobItemsStatus>('idle');
    const [commonPage, setCommonPage] = useState(0);
    const [result, setResult] = useState<CareerResult | null>(null);
    const [competencyScores, setCompetencyScores] = useState<Record<CompetencyKey, number> | null>(null);
    const [error, setError] = useState('');
    // 버튼 연속 클릭 등으로 submit()이 중복 실행되는 것을 막는 즉시 체크용 플래그
    const inFlightRef = useRef(false);
    const jobItemsPromiseRef = useRef<Promise<JobItem[]> | null>(null);
    // 희망직무를 바꿔 맞춤 문항을 다시 요청했을 때, 먼저 보낸(이미 낡은) 요청의 응답이 나중에 와서
    // 최신 응답을 덮어쓰지 않도록 요청마다 번호를 매겨 마지막 요청의 응답만 반영한다.
    const jobItemsRequestIdRef = useRef(0);

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

    async function requestJobItems(): Promise<JobItem[]> {
        const requestId = ++jobItemsRequestIdRef.current;
        setJobItemsStatus('loading');
        const items = await fetchJobItems(desiredJob);
        if (jobItemsRequestIdRef.current === requestId) {
            setJobItems(items);
            setJobItemsStatus('ready');
        }
        return items;
    }

    /** 희망직무 맞춤 문항을 백그라운드로 다시 요청한다. 이전 직무의 맞춤 문항·점수는 즉시 비운다. */
    function goToItems() {
        setJobItems([]);
        setJobItemsStatus('idle');
        setItemRatings(clearJobRatings);
        jobItemsPromiseRef.current = requestJobItems();
        setCommonPage(0);
        setStep('items');
    }

    async function submit() {
        if (inFlightRef.current) return;
        inFlightRef.current = true;
        setStep('loading');
        setError('');
        const outcome = await submitCareerRequest({ desiredJob, experiences, strengthNote, itemRatings, jobItems });
        if (outcome.ok) {
            setResult(outcome.result);
            setCompetencyScores(outcome.scores);
            setStep('result');
        } else {
            setError(outcome.message);
            setStep(hasJobItemsPage(jobItems) ? 'jobItems' : 'items');
        }
        inFlightRef.current = false;
    }

    async function nextPage() {
        if (step === 'jobItems') { await submit(); return; }
        if (step !== 'items') return;
        const action = decideItemsNextAction(commonPage, jobItemsStatus, jobItems);
        if (action === 'advanceCommonPage') { setCommonPage(p => p + 1); return; }
        if (action === 'goToJobItems') { setStep('jobItems'); return; }
        if (action === 'submit') { await submit(); return; }
        // waitForJobItems: 맞춤 문항 요청이 아직 끝나지 않았다 — 끝날 때까지 잠깐 기다렸다가 결정한다.
        setStep('waitingJobItems');
        const items = jobItemsPromiseRef.current ? await jobItemsPromiseRef.current : [];
        if (hasJobItemsPage(items)) setStep('jobItems'); else await submit();
    }

    function prevPage() {
        const action = decidePrevAction(step, commonPage);
        if (action === 'backToItemsStep') setStep('items');
        else if (action === 'decrementCommonPage') setCommonPage(p => p - 1);
        else setStep('input');
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
