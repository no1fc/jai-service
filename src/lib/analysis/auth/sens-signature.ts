/**
 * 네이버 클라우드 SENS API 서명 — 설계서 10.2.1절.
 * StringToSign = "{method} {uri}\n{timestamp}\n{accessKey}", HMAC-SHA256(secretKey, StringToSign) → Base64.
 * 순수 함수(네트워크·환경변수 접근 없음) — 고정 입력 → 고정 출력이라 회귀 테스트로 서명 규칙을 고정한다.
 */
import crypto from 'crypto';

export interface SensSignatureInput {
    accessKey: string;
    secretKey: string;
    method: string;
    uri: string;
    timestamp: string;
}

/** SENS 요청 서명을 만든다(Base64 문자열). */
export function buildSensSignature({ accessKey, secretKey, method, uri, timestamp }: SensSignatureInput): string {
    const stringToSign = `${method} ${uri}\n${timestamp}\n${accessKey}`;
    return crypto.createHmac('sha256', secretKey).update(stringToSign).digest('base64');
}
