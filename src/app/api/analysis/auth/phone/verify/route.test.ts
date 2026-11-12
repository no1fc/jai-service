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
import { verifyCode } from '@/lib/analysis/auth/phone';
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
const ROW = { id: 7, code_hash: 'hash', attempts: 0, expires_at: new Date(), verified_at: null };

beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getClientIp).mockReturnValue('1.1.1.1');
    vi.mocked(checkRateLimit).mockReturnValue({ allowed: true, remaining: 29, resetAt: Date.now() + 1000 });
    vi.mocked(latestVerification).mockResolvedValue(ROW);
    vi.mocked(incrementAttempts).mockResolvedValue(undefined);
    vi.mocked(markVerified).mockResolvedValue(undefined);
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

    it('발송 기록이 없으면 400 "인증번호를 먼저 요청해 주세요." (세션 미발급)', async () => {
        vi.mocked(latestVerification).mockResolvedValue(null);
        const res = await POST(req(VALID_BODY));
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toBe('인증번호를 먼저 요청해 주세요.');
        expect(incrementAttempts).not.toHaveBeenCalled();
        expect(issueUserSession).not.toHaveBeenCalled();
    });

    it('비교 전에 시도 횟수를 먼저 증가시키고, 증가된 값으로 비교한다', async () => {
        await POST(req(VALID_BODY));
        expect(incrementAttempts).toHaveBeenCalledWith(7);
        expect(verifyCode).toHaveBeenCalledWith(
            expect.objectContaining({ attempts: ROW.attempts + 1 }),
            '01012345678',
            '123456',
            expect.any(Date),
        );
        const incrementOrder = vi.mocked(incrementAttempts).mock.invocationCallOrder[0];
        const verifyOrder = vi.mocked(verifyCode).mock.invocationCallOrder[0];
        expect(incrementOrder).toBeLessThan(verifyOrder);
    });

    it('ok → 사용 완료 처리 + upsertUser(phone) + 세션 발급 + 200', async () => {
        const res = await POST(req(VALID_BODY));
        expect(markVerified).toHaveBeenCalledWith(7);
        expect(upsertUser).toHaveBeenCalledWith({ provider: 'phone', providerId: '01012345678', consent: true });
        expect(issueUserSession).toHaveBeenCalledWith(res, 42, expect.anything());
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json).toMatchObject({ success: true, user: { id: 42 } });
    });

    it('expired → 400 "인증번호가 만료되었습니다." (세션 미발급)', async () => {
        vi.mocked(verifyCode).mockReturnValue('expired');
        const res = await POST(req(VALID_BODY));
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toBe('인증번호가 만료되었습니다.');
        expect(issueUserSession).not.toHaveBeenCalled();
    });

    it('exhausted → 429 "시도 횟수를 초과했습니다. 다시 요청해 주세요."', async () => {
        vi.mocked(verifyCode).mockReturnValue('exhausted');
        const res = await POST(req(VALID_BODY));
        expect(res.status).toBe(429);
        const json = await res.json();
        expect(json.error).toBe('시도 횟수를 초과했습니다. 다시 요청해 주세요.');
        expect(issueUserSession).not.toHaveBeenCalled();
    });

    it('mismatch → 400 "인증번호가 올바르지 않습니다."', async () => {
        vi.mocked(verifyCode).mockReturnValue('mismatch');
        const res = await POST(req(VALID_BODY));
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toBe('인증번호가 올바르지 않습니다.');
    });

    it('used → 400 "인증번호가 올바르지 않습니다." (mismatch와 동일한 일반 메시지)', async () => {
        vi.mocked(verifyCode).mockReturnValue('used');
        const res = await POST(req(VALID_BODY));
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toBe('인증번호가 올바르지 않습니다.');
    });
});
