/**
 * 분석 키워드 파싱·정규화 — 순수 함수, 클라이언트 안전(crypto 의존성 없음). 설계서 5.1.
 */

export const KEYWORDS_MAX = 3;
export const KEYWORDS_INPUT_MAX = 160;

/** 허용 문자: 한글·영문·숫자·공백·/ + # . & - */
const DISALLOWED = /[^\p{Script=Hangul}\p{Script=Latin}0-9 /+#.&-]/gu;

/** 키워드를 정규화한다(전각·대소문자·허용 외 문자 정리) — 캐시 키·중복 판정의 기준. */
export function normalizeKeyword(raw: string): string {
    return raw.normalize('NFKC').toLowerCase().replace(DISALLOWED, '').replace(/\s+/g, ' ').trim();
}

/**
 * 쉼표(반각 `,`·전각 `，`)로 구분된 입력을 키워드 배열로 나눈다.
 * trim, 빈 값 제거, normalizeKeyword 기준 중복 제거(먼저 나온 것을 유지)만 수행한다.
 * 개수·길이 상한은 자르지 않고 그대로 반환하며, 검증은 스키마(compareRequestSchema)가 담당한다.
 */
export function parseKeywords(raw: string): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const token of raw.split(/[,，]/)) {
        const trimmed = token.trim();
        if (!trimmed) continue;
        const norm = normalizeKeyword(trimmed);
        if (seen.has(norm)) continue;
        seen.add(norm);
        result.push(trimmed);
    }
    return result;
}
