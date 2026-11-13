/**
 * 카카오 Redirect URI를 요청 헤더 기반으로 계산한다.
 * 운영/개발 서버가 다른 주소를 쓰므로, 접속한 서버의 실제 주소를 그대로 보여주기 위해
 * `x-forwarded-proto`/`host` 헤더로부터 조립한다(하드코딩 금지).
 * @param proto - `x-forwarded-proto` 헤더 값. 없으면 'http'로 간주한다.
 * @param host - `host` 헤더 값(포트 포함 가능, 예: "localhost:3000").
 */
export function buildKakaoRedirectUri(proto: string | null | undefined, host: string | null | undefined): string {
    const safeProto = proto || 'http';
    const safeHost = host || '';
    return `${safeProto}://${safeHost}/api/analysis/auth/kakao/callback`;
}
