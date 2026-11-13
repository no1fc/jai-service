/**
 * LoginForm·SignupForm·PasswordChangeForm의 판단 로직(순수 함수) — DOM·네트워크 의존 없이 vitest로 검증한다.
 * 이메일·비밀번호 형식 검증은 서버와 동일한 {@link ../../lib/analysis/auth/local-schema}를 재사용한다.
 */
import { emailSchema, passwordSchema, PASSWORD_MIN } from '@/lib/analysis/auth/local-schema';

/** 두 필수 동의(개인정보 수집, 연령 확인)가 모두 체크됐을 때만 true. */
export function isAgreed(consentCollect: boolean, consentAge: boolean): boolean {
    return consentCollect && consentAge;
}

/** 로그인 버튼 활성화 여부 — 이메일 형식·비밀번호 입력 여부만 본다(복잡도는 가입 때 이미 검증됨). */
export function canSubmitLogin(email: string, password: string, loading: boolean): boolean {
    if (loading) return false;
    return emailSchema.safeParse(email).success && password.length > 0;
}

/** 가입 버튼 활성화 여부 — 동의·이메일 형식·비밀번호 형식·확인 일치를 모두 만족해야 한다. */
export function canSubmitSignup(agreed: boolean, email: string, password: string, confirm: string, loading: boolean): boolean {
    if (loading || !agreed) return false;
    if (!emailSchema.safeParse(email).success) return false;
    if (!passwordSchema.safeParse(password).success) return false;
    return password === confirm;
}

/** 비밀번호가 아직 부족한 조건을 안내하는 문구(입력 중 표시) — 모두 만족하면 빈 문자열. */
export function passwordHint(password: string): string {
    const missing: string[] = [];
    if (password.length < PASSWORD_MIN) missing.push(`${PASSWORD_MIN}자 이상`);
    if (!/[a-z]/i.test(password)) missing.push('영문');
    if (!/\d/.test(password)) missing.push('숫자');
    return missing.length === 0 ? '' : `${missing.join('·')} 포함 필요`;
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
