/**
 * LoginForm의 판단 로직(순수 함수) — DOM·네트워크 의존 없이 vitest로 검증한다.
 */

/** 두 필수 동의(개인정보 수집, 연령 확인)가 모두 체크됐을 때만 true. */
export function isAgreed(consentCollect: boolean, consentAge: boolean): boolean {
    return consentCollect && consentAge;
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
