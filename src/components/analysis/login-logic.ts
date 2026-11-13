/**
 * LoginForm의 판단 로직(순수 함수) — DOM·네트워크 의존 없이 vitest로 검증한다.
 */

export type PhoneStep = 'phone' | 'code';

/** 하이픈 유무를 모두 허용하는 국내 휴대폰 번호 형식(서버 phoneSchema와 동일한 패턴). */
const PHONE_FORMAT_RE = /^01[016789]-?\d{3,4}-?\d{4}$/;

/** 입력한 번호가 국내 휴대폰 번호 형식인지 판정한다(최종 검증은 서버가 한다). */
export function isValidPhoneFormat(phone: string): boolean {
    return PHONE_FORMAT_RE.test(phone);
}

/** 두 필수 동의(개인정보 수집, 연령 확인)가 모두 체크됐을 때만 true. */
export function isAgreed(consentCollect: boolean, consentAge: boolean): boolean {
    return consentCollect && consentAge;
}

/** "인증번호 받기" 버튼 활성 조건 — 동의·번호 형식·로딩 상태를 모두 본다. */
export function canRequestCode(agreed: boolean, phone: string, loading: boolean): boolean {
    return agreed && !loading && isValidPhoneFormat(phone);
}

/** "확인" 버튼 활성 조건 — 6자리 코드가 모두 입력됐고 로딩 중이 아닐 때. */
export function canVerifyCode(code: string, loading: boolean): boolean {
    return !loading && code.length === 6;
}

/** 인증번호 발송 결과에 따라 다음 단계를 정한다 — 성공해야만 code 단계로 전환하고, 실패하면 현재 단계를 유지한다. */
export function nextPhoneStep(current: PhoneStep, sendSucceeded: boolean): PhoneStep {
    return sendSucceeded ? 'code' : current;
}

/** 발송 응답의 expiresInSec을 파싱한다 — 값이 없거나 숫자가 아니면 기본값(180초)을 쓴다. */
export function resolveExpiresInSec(raw: unknown, fallbackSec = 180): number {
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : fallbackSec;
}

/** 남은 초를 "분:초" 문자열로 포맷한다(초는 두 자리로 0을 채움, 음수는 0으로 바닥 처리). */
export function formatCountdown(sec: number): string {
    const safeSec = Math.max(0, Math.trunc(sec));
    const m = Math.floor(safeSec / 60);
    const s = safeSec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

const CALLBACK_ERROR_MESSAGES: Record<string, string> = {
    cancelled: '카카오 로그인을 취소했습니다.',
    kakao: '카카오 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.',
    state: '로그인 요청이 만료되었습니다. 처음부터 다시 시도해 주세요.',
};

/** 알 수 없는 `?error=` 값에 대한 기본 메시지 — kakao 사유와 같은 문구를 재사용한다. */
const UNKNOWN_CALLBACK_ERROR_MESSAGE = CALLBACK_ERROR_MESSAGES.kakao;

/** 카카오 콜백의 `?error=` 값을 사용자에게 보여줄 메시지로 바꾼다. 쿼리 자체가 없으면 null. */
export function resolveCallbackErrorMessage(code: string | null): string | null {
    if (!code) return null;
    return CALLBACK_ERROR_MESSAGES[code] ?? UNKNOWN_CALLBACK_ERROR_MESSAGE;
}
