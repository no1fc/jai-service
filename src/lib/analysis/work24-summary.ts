/** 고용24 공고 배열을 프롬프트용 요약으로 축약한다(순수 함수). */
import type { Work24Summary } from './schema';
import type { Work24Posting } from './work24';

const SAMPLE_COUNT = 10;
const TOP_N = 5;
const EMP_TYPE_LABEL: Record<string, string> = {
    '10': '기간의 정함이 없는 근로계약',
    '11': '기간의 정함이 있는 근로계약',
    '20': '시간(선택)제',
    '30': '파견·용역',
    '40': '일용',
    '50': '프리랜서',
};
const BANDS: Array<[string, number, number]> = [
    ['2,400만 원 미만', 0, 2400],
    ['2,400~3,000만 원', 2400, 3000],
    ['3,000~4,000만 원', 3000, 4000],
    ['4,000~5,000만 원', 4000, 5000],
    ['5,000만 원 이상', 5000, Infinity],
];

const num = (s: string) => {
    const n = Number(s.replace(/[^\d]/g, ''));
    return Number.isFinite(n) && n > 0 ? n : null;
};

/** 연봉(만 원) 환산. 연봉 그대로, 월급 ×12, 그 외(시급·일급·면접후결정)는 null */
export function annualSalaryManwon(salTpNm: string, minSal: string, maxSal: string): number | null {
    const lo = num(minSal), hi = num(maxSal);
    const base = lo && hi ? (lo + hi) / 2 : (lo ?? hi);
    if (!base) return null;
    if (salTpNm.includes('연봉')) return base;
    if (salTpNm.includes('월급')) return base * 12;
    return null;
}

const countBy = <T>(arr: T[], key: (t: T) => string) => {
    const m = new Map<string, number>();
    arr.forEach(t => { const k = key(t); if (k) m.set(k, (m.get(k) ?? 0) + 1); });
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
};

/** 공고 목록·총건수를 지역/연봉구간/고용형태 통계와 샘플로 압축한다. */
export function summarizeWork24(items: Work24Posting[], total: number, fetchedAt: string): Work24Summary {
    const topRegions = countBy(items, i => i.region.split(' ')[0])
        .slice(0, TOP_N)
        .map(([region, count]) => ({ region, count }));
    const salaryBands = BANDS.map(([band, lo, hi]) => ({
        band,
        count: items.filter(i => {
            const a = annualSalaryManwon(i.salTpNm, i.minSal, i.maxSal);
            return a !== null && a >= lo && a < hi;
        }).length,
    })).concat({
        band: '미표기',
        count: items.filter(i => annualSalaryManwon(i.salTpNm, i.minSal, i.maxSal) === null).length,
    });
    const employmentTypes = countBy(items, i => EMP_TYPE_LABEL[i.empTpCd] ?? '기타')
        .map(([type, count]) => ({ type, count }));
    const samples = items.slice(0, SAMPLE_COUNT).map(i => ({
        title: i.title, company: i.company, region: i.region, sal: i.sal, closeDt: i.closeDt, url: i.wantedInfoUrl,
    }));
    return { total, sampled: items.length, topRegions, salaryBands, employmentTypes, samples, fetchedAt };
}
