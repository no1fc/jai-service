import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: vi.fn(), getClientIp: vi.fn() }));
vi.mock('@/lib/analysis/auth/phone', async () => {
    const actual = await vi.importActual<typeof import('@/lib/analysis/auth/phone')>('@/lib/analysis/auth/phone');
    return { ...actual, verifyCode: vi.fn() };
});
vi.mock('@/lib/analysis/auth/phone-store', () => ({
    latestVerification: vi.fn(),
    incrementAttempts: vi.fn(),
    markVerified: vi.fn(),
}));
vi.mock('@/lib/analysis/users', () => ({ upsertUser: vi.fn() }));
vi.mock('@/lib/analysis/auth/user-session', () => ({ issueUserSession: vi.fn() }));

import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { MAX_ATTEMPTS, verifyCode } from '@/lib/analysis/auth/phone';
import { incrementAttempts, latestVerification, markVerified } from '@/lib/analysis/auth/phone-store';
import { upsertUser } from '@/lib/analysis/users';
import { issueUserSession } from '@/lib/analysis/auth/user-session';
import { POST } from './route';

function req(body: unknown) {
    return new NextRequest('http://localhost/api/analysis/auth/phone/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

const VALID_BODY = { phone: '01012345678', code: '123456' };
const ROW = { id: 7, code_hash: 'hash', attempts: 4, expires_at: new Date(), verified_at: null };
const GENERIC_INVALID = '인증번호가 올바르지 않거나 만료되었습니다. 인증번호를 다시 요청해 주세요.';

beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getClientIp).mockReturnValue('1.1.1.1');
    vi.mocked(checkRateLimit).mockReturnValue({ allowed: true, remaining: 29, resetAt: Date.now() + 1000 });
    vi.mocked(latestVerification).mockResolvedValue(ROW);
    vi.mocked(incrementAttempts).mockResolvedValue(5); // store가 반환하는 "원자적으로 증가된" 실제 값
    vi.mocked(markVerified).mockResolvedValue(true);
    vi.mocked(verifyCode).mockReturnValue('ok');
    vi.mocked(upsertUser).mockResolvedValue({ id: 42 });
});

describe('POST /api/analysis/auth/phone/verify', () => {
    it('rate limit에 걸리면 429를 반환하고 세션을 발급하지 않는다', async () => {
        vi.mocked(checkRateLimit).mockReturnValue({ allowed: false, remaining: 0, resetAt: Date.now() + 1000 });
        const res = await POST(req(VALID_BODY));
        expect(res.status).toBe(429);
        expect(issueUserSession).not.toHaveBeenCalled();
    });

    it('입력값이 올바르지 않으면 400', async () => {
        const res = await POST(req({ phone: '01012345678', code: 'abcdef' }));
        expect(res.status).toBe(400);
        expect(latestVerification).not.toHaveBeenCalled();
    });

    it('발송 기록이 없으면 통일된 400 메시지 (세션 미발급, 증가 호출 없음)', async () => {
        vi.mocked(latestVerification).mockResolvedValue(null);
        const res = await POST(req(VALID_BODY));
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toBe(GENERIC_INVALID);
        expect(incrementAttempts).not.toHaveBeenCalled();
        expect(issueUserSession).not.toHaveBeenCalled();
    });

    it('incrementAttempts가 null(이미 사용됨/행 없음)이면 비교 없이 통일된 400으로 거부한다', async () => {
        vi.mocked(incrementAttempts).mockResolvedValue(null);
        const res = await POST(req(VALID_BODY));
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toBe(GENERIC_INVALID);
        expect(verifyCode).not.toHaveBeenCalled();
        expect(issueUserSession).not.toHaveBeenCalled();
    });

    it('이미 시도 횟수 상한(MAX_ATTEMPTS)에 도달해 store가 더 증가시키지 못하고(null) 반환해도 비교 없이 통일된 400으로 거부한다', async () => {
        // phone-store.ts의 incrementAttempts는 WHERE attempts < @maxAttempts에 걸리면 null을 반환한다 —
        // 라우트는 "이미 사용됨"과 "상한 도달"을 구분하지 않고 같은 통일 메시지로 응답해야 한다.
        vi.mocked(incrementAttempts).mockResolvedValue(null);
        const res = await POST(req(VALID_BODY));
        expect(incrementAttempts).toHaveBeenCalledWith(7, MAX_ATTEMPTS);
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toBe(GENERIC_INVALID);
        expect(verifyCode).not.toHaveBeenCalled();
    });

    it('비교 전에 시도 횟수를 먼저 원자적으로 증가시키고, store가 반환한 실제 값으로만 비교한다(로컬 +1 계산 금지)', async () => {
        await POST(req(VALID_BODY));
        expect(incrementAttempts).toHaveBeenCalledWith(7, MAX_ATTEMPTS);
        // store가 반환한 값(5)을 그대로 써야 한다 — row.attempts(4)+1을 로컬로 계산해서 쓰면 안 된다.
        expect(verifyCode).toHaveBeenCalledWith(
            expect.objectContaining({ attempts: 5 }),
            '01012345678',
            '123456',
            expect.any(Date),
        );
        const incrementOrder = vi.mocked(incrementAttempts).mock.invocationCallOrder[0];
        const verifyOrder = vi.mocked(verifyCode).mock.invocationCallOrder[0];
        expect(incrementOrder).toBeLessThan(verifyOrder);
    });

    it('동시 요청 시나리오: 같은 row(attempts=4)를 읽어도 store가 5·6을 순서대로 반환하면 둘 다 exhausted로 거부된다', async () => {
        vi.mocked(incrementAttempts).mockResolvedValueOnce(5).mockResolvedValueOnce(6);
        vi.mocked(latestVerification).mockResolvedValue(ROW); // 두 요청 모두 같은 stale snapshot(attempts=4)을 읽음
        const { verifyCode: actualVerifyCode } = await vi.importActual<typeof import('@/lib/analysis/auth/phone')>('@/lib/analysis/auth/phone');
        vi.mocked(verifyCode).mockImplementation(actualVerifyCode);

        const res1 = await POST(req(VALID_BODY));
        const res2 = await POST(req(VALID_BODY));

        expect(res1.status).toBe(400);
        expect(res2.status).toBe(400);
        expect((await res1.json()).error).toBe(GENERIC_INVALID);
        expect((await res2.json()).error).toBe(GENERIC_INVALID);
        expect(issueUserSession).not.toHaveBeenCalled();
        // 두 호출 모두 store가 돌려준 실제 값(5, 6)으로 비교했는지 확인 — 둘 다 MAX_ATTEMPTS(5) 이상이라 exhausted.
        expect(verifyCode).toHaveBeenNthCalledWith(1, expect.objectContaining({ attempts: 5 }), '01012345678', '123456', expect.any(Date));
        expect(verifyCode).toHaveBeenNthCalledWith(2, expect.objectContaining({ attempts: 6 }), '01012345678', '123456', expect.any(Date));
    });

    it('ok → markVerified(원자적 1회용 처리) 성공 시 upsertUser(phone) + 세션 발급 + 200', async () => {
        const res = await POST(req(VALID_BODY));
        expect(markVerified).toHaveBeenCalledWith(7);
        expect(upsertUser).toHaveBeenCalledWith({ provider: 'phone', providerId: '01012345678', consent: true });
        expect(issueUserSession).toHaveBeenCalledWith(res, 42, expect.anything());
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json).toMatchObject({ success: true, user: { id: 42 } });
    });

    it('ok인데 markVerified가 false(동시 요청 중 레이스로 선점당함)면 통일된 400으로 거부하고 세션을 발급하지 않는다', async () => {
        vi.mocked(markVerified).mockResolvedValue(false);
        const res = await POST(req(VALID_BODY));
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toBe(GENERIC_INVALID);
        expect(upsertUser).not.toHaveBeenCalled();
        expect(issueUserSession).not.toHaveBeenCalled();
    });

    it.each(['expired', 'exhausted', 'mismatch', 'used'] as const)(
        '%s → 통일된 400 메시지(세션 미발급)',
        async (result) => {
            vi.mocked(verifyCode).mockReturnValue(result);
            const res = await POST(req(VALID_BODY));
            expect(res.status).toBe(400);
            const json = await res.json();
            expect(json.error).toBe(GENERIC_INVALID);
            expect(issueUserSession).not.toHaveBeenCalled();
        },
    );
});
