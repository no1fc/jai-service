import { readFileSync } from 'fs';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/db', () => ({ getSetting: vi.fn() }));
import { getSetting } from '@/lib/db';
import { fetchWork24Summary, parseWork24Xml, WORK24_LIST_URL } from './work24';
import { annualSalaryManwon, summarizeWork24 } from './work24-summary';

const xml = readFileSync(path.join(__dirname, '__fixtures__/work24-sample.xml'), 'utf8');

describe('parseWork24Xml', () => {
    it('total과 공고 목록을 추출하고 CDATA·엔티티를 해석한다', () => {
        const r = parseWork24Xml(xml);
        expect(r.total).toBe(137);
        expect(r.items).toHaveLength(2);
        expect(r.items[0].company).toBe('(주)핀테크랩');
        expect(r.items[0].title).toBe('핀테크 서비스 PM & 기획');
        expect(r.items[1].maxSal).toBe('');
    });
    it('공고가 없으면 빈 배열', () => {
        expect(parseWork24Xml('<wantedRoot><total>0</total></wantedRoot>').items).toEqual([]);
    });
});

describe('annualSalaryManwon', () => {
    it('연봉은 그대로, 월급은 ×12, 시급·면접후결정은 null', () => {
        expect(annualSalaryManwon('연봉', '4000', '5500')).toBe(4750);
        expect(annualSalaryManwon('월급', '300', '')).toBe(3600);
        expect(annualSalaryManwon('시급', '10030', '')).toBeNull();
        expect(annualSalaryManwon('면접후결정', '', '')).toBeNull();
    });
});

describe('summarizeWork24', () => {
    it('지역 상위·연봉 구간·고용형태·샘플 10건을 만든다', () => {
        const { items, total } = parseWork24Xml(xml);
        const s = summarizeWork24(items, total, '2026-11-12T00:00:00Z');
        expect(s.total).toBe(137);
        expect(s.sampled).toBe(2);
        expect(s.topRegions[0]).toEqual({ region: '서울', count: 1 });
        expect(s.salaryBands.find(b => b.band === '4,000~5,000만 원')?.count).toBe(1);
        expect(s.salaryBands.find(b => b.band === '3,000~4,000만 원')?.count).toBe(1);
        expect(s.employmentTypes[0].type).toBe('기간의 정함이 없는 근로계약');
        expect(s.samples).toHaveLength(2);
        expect(s.samples[0].url).toContain('work24.go.kr');
    });
});

describe('fetchWork24Summary', () => {
    afterEach(() => { vi.unstubAllGlobals(); });
    it('키가 없으면 fetch 없이 null', async () => {
        vi.mocked(getSetting).mockResolvedValue(null);
        const f = vi.fn(); vi.stubGlobal('fetch', f);
        expect(await fetchWork24Summary('PM')).toBeNull();
        expect(f).not.toHaveBeenCalled();
    });
    it('정상 응답이면 요약을 반환하고 URL에 키·키워드가 들어간다', async () => {
        vi.mocked(getSetting).mockResolvedValue('TESTKEY');
        const f = vi.fn().mockResolvedValue(new Response(xml, { status: 200 }));
        vi.stubGlobal('fetch', f);
        const s = await fetchWork24Summary('핀테크 PM');
        expect(getSetting).toHaveBeenCalledWith('work24_api_key');
        expect(s?.total).toBe(137);
        const url = new URL(f.mock.calls[0][0] as string);
        expect(url.origin + url.pathname).toBe(WORK24_LIST_URL);
        expect(url.searchParams.get('authKey')).toBe('TESTKEY');
        expect(url.searchParams.get('keyword')).toBe('핀테크 PM');
        expect(url.searchParams.get('returnType')).toBe('XML');
    });
    it('HTTP 오류·비정상 XML이면 null', async () => {
        vi.mocked(getSetting).mockResolvedValue('TESTKEY');
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('error', { status: 500 })));
        expect(await fetchWork24Summary('PM')).toBeNull();
    });
});
