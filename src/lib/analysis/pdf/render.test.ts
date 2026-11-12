import { describe, expect, it } from 'vitest';
import { pdfFileName, renderReportPdf } from './render';
import type { IndustryReport, JobReport, PublicReport } from '../schema';

const jobContent: JobReport = {
    title: '핀테크 PM', summary: '핀테크 서비스의 기획·운영을 총괄하는 직무입니다.', aliases: ['프로덕트 매니저'],
    mainTasks: ['서비스 로드맵 수립', '유관 부서 협업', '지표 분석'],
    skills: { hard: ['SQL', '데이터 분석'], soft: ['커뮤니케이션'], certifications: ['PMP'] },
    hiring: { summary: '채용이 꾸준히 늘고 있습니다.', demandLevel: 'high', postingCount: 137, topRegions: ['서울'] },
    salary: { entry: '3,000~3,600만 원', mid: '4,500~5,500만 원', senior: '7,000만 원 이상', basis: '고용24 공고 기준' },
    roadmap: [
        { stage: '1단계', period: '1~2개월', actions: ['국민내일배움카드로 PM 교육 수강'] },
        { stage: '2단계', period: '3~4개월', actions: ['사이드 프로젝트 수행'] },
        { stage: '3단계', period: '5~6개월', actions: ['포트폴리오 정리', '지원'] },
    ],
    relatedJobs: ['서비스 기획자'],
};

const industryContent: IndustryReport = {
    title: '핀테크 산업', summary: '금융과 기술이 결합된 빠르게 성장하는 산업입니다.', segments: ['결제', '대출'],
    market: { summary: '시장이 빠르게 성장하고 있습니다.', keyPoints: ['모바일 결제 확대', '규제 완화', 'AI 도입'], outlook: '향후 5년간 성장할 전망입니다.' },
    companies: [
        { name: 'A사', description: '간편결제 서비스를 제공합니다.' },
        { name: 'B사', description: '대출 중개 플랫폼입니다.', note: '상장사' },
        { name: 'C사', description: '송금 서비스를 제공합니다.' },
        { name: 'D사', description: '자산관리 서비스를 제공합니다.' },
        { name: 'E사', description: '보험 비교 서비스를 제공합니다.' },
    ],
    hiring: { summary: '개발·기획 인력 채용이 활발합니다.', demandLevel: 'medium', postingCount: 54, topRegions: ['서울', '경기'], inDemandRoles: ['백엔드 개발자'] },
    promisingJobs: [{ name: '백엔드 개발자', reason: '결제 인프라 수요 증가' }, { name: '데이터 분석가', reason: '리스크 분석 수요 증가' }, { name: 'PM', reason: '신규 서비스 기획 수요' }],
    keywords: ['핀테크', '결제', '대출'],
};

function makeReport(content: JobReport | IndustryReport, overrides: Partial<PublicReport> = {}): PublicReport {
    return {
        publicId: '123e4567-e89b-12d3-a456-426655440000',
        type: 'roadmap' in content ? 'job' : 'industry',
        keyword: content.title,
        scope: 'kr',
        content,
        meta: {
            dataUsed: ['work24', 'search'],
            work24: {
                total: 137, sampled: 100, topRegions: [{ region: '서울', count: 70 }],
                salaryBands: [{ band: '4,000~5,000만 원', count: 30 }],
                employmentTypes: [{ type: '기간의 정함이 없는 근로계약', count: 90 }],
                samples: [{ title: 'PM', company: 'A사', region: '서울 강남구', sal: '연봉 4,000만원', closeDt: '2026-12-31', url: 'https://www.work24.go.kr/x' }],
                fetchedAt: '2026-11-12T00:00:00Z',
            },
            sources: [{ title: '관련 기사', uri: 'https://example.com/a' }, { title: '관련 리포트', uri: 'https://example.com/b' }],
            searchEntryPoint: null,
            modelName: 'gemini-test',
        },
        createdAt: '2026-11-12T00:00:00.000Z',
        expiresAt: '2026-11-19T00:00:00.000Z',
        ...overrides,
    };
}

const jobReport = makeReport(jobContent);
const industryReport = makeReport(industryContent);

describe('renderReportPdf', () => {
    it('직무 리포트를 %PDF-로 시작하는 Buffer로 렌더링한다', async () => {
        const buf = await renderReportPdf(jobReport);
        expect(Buffer.isBuffer(buf)).toBe(true);
        expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
    });

    it('산업 리포트를 %PDF-로 시작하는 Buffer로 렌더링한다', async () => {
        const buf = await renderReportPdf(industryReport);
        expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
    });

    it('고용24 데이터가 없어도(null) 렌더링된다', async () => {
        const report = makeReport(jobContent, { meta: { ...jobReport.meta, work24: null, dataUsed: ['search'] } });
        const buf = await renderReportPdf(report);
        expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
    });

    it('본문에 PDF/헤더를 깨뜨릴 수 있는 문자(따옴표·CRLF·슬래시·이모지)가 있어도 렌더링이 실패하지 않는다', async () => {
        const trickyContent: JobReport = { ...jobContent, title: '핀테크"PM"/매니저 🚀', summary: '줄바꿈\r\n포함 "요약" 입니다.' };
        const report = makeReport(trickyContent);
        const buf = await renderReportPdf(report);
        expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
    });

    it('Noto Sans KR 폰트가 PDF에 임베드된다(폰트 이름 문자열 포함)', async () => {
        const buf = await renderReportPdf(jobReport);
        expect(buf.toString('latin1')).toContain('NotoSansKR');
    });
});

describe('pdfFileName', () => {
    it('J.AI_유형_키워드_날짜.pdf 형식으로 만든다', () => {
        expect(pdfFileName(jobReport)).toBe('J.AI_직무분석_핀테크PM_2026-11-12.pdf');
    });

    it('.pdf로 끝난다', () => {
        expect(pdfFileName(industryReport)).toMatch(/\.pdf$/);
    });

    it('공백을 제거한다', () => {
        expect(pdfFileName(jobReport)).not.toContain(' ');
    });

    it('따옴표·CRLF·슬래시·이모지 등 위험 문자를 제거한다', () => {
        const report = makeReport(jobContent, { keyword: '핀테크"PM"\r\n/매니저 🚀' });
        const name = pdfFileName(report);
        expect(name).not.toMatch(/["'/\r\n]/);
        expect(name).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
        expect(name.endsWith('.pdf')).toBe(true);
    });

    it('키워드가 전부 위험 문자뿐이어도 빈 베이스 이름이 되지 않는다', () => {
        const report = makeReport(jobContent, { keyword: '🚀🚀🚀' });
        expect(pdfFileName(report)).toBe('J.AI_직무분석_키워드_2026-11-12.pdf');
    });
});
