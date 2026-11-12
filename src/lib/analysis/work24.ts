/**
 * 고용24(구 워크넷) Open API 채용정보 목록 조회 — 서버 전용.
 * 인증키는 환경변수가 아니라 system_settings('work24_api_key')에서 조회한다(관리자 화면 입력).
 * 키가 없거나 실패하면 null을 반환해 리포트 생성은 계속된다(우아한 저하).
 * 응답은 XML만 지원(returnType=XML). 공식: work24.go.kr Open-API 소개 > 채용정보.
 */
import { getSetting } from '@/lib/db';
import { logger } from '@/lib/logger';
import type { Work24Summary } from './schema';
import { summarizeWork24 } from './work24-summary';

export const WORK24_LIST_URL = 'https://www.work24.go.kr/cm/openApi/call/wk/callOpenApiSvcInfo210L01.do';
const TIMEOUT_MS = 5000;
const DISPLAY = 100;
const FIELDS = [
    'wantedAuthNo', 'company', 'title', 'salTpNm', 'sal', 'minSal', 'maxSal',
    'region', 'empTpCd', 'closeDt', 'wantedInfoUrl',
] as const;
export type Work24Posting = Record<(typeof FIELDS)[number], string>;

// ponytail: 평탄한 태그만 있는 응답이라 정규식 파서로 충분. 중첩·네임스페이스가 생기면 fast-xml-parser로 교체
const decode = (s: string) => s.replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/, '$1')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").trim();
const tag = (block: string, name: string) => decode(block.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1] ?? '');

/** 고용24 XML 응답에서 총건수와 공고 목록을 추출한다. */
export function parseWork24Xml(xml: string): { total: number; items: Work24Posting[] } {
    const total = Number(tag(xml, 'total')) || 0;
    const items = [...xml.matchAll(/<wanted>([\s\S]*?)<\/wanted>/g)].map(m =>
        Object.fromEntries(FIELDS.map(f => [f, tag(m[1], f)])) as Work24Posting);
    return { total, items };
}

/** 키워드로 고용24 채용정보를 조회해 요약을 반환한다. 키 없음/실패/타임아웃이면 null. */
export async function fetchWork24Summary(keyword: string): Promise<Work24Summary | null> {
    const authKey = await getSetting('work24_api_key');
    if (!authKey) {
        logger.warn('[고용24] work24_api_key 미설정 — 채용 데이터 미반영');
        return null;
    }
    const url = new URL(WORK24_LIST_URL);
    Object.entries({ authKey, callTp: 'L', returnType: 'XML', startPage: '1', display: String(DISPLAY), keyword })
        .forEach(([k, v]) => url.searchParams.set(k, v));
    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { total, items } = parseWork24Xml(await res.text());
        if (items.length === 0 && total > 0) throw new Error('XML 형식 불일치');
        return summarizeWork24(items, total, new Date().toISOString());
    } catch (error) {
        logger.warn('[고용24] 조회 실패 — 채용 데이터 미반영:', error instanceof Error ? error.message : error);
        return null;
    }
}
