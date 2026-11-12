import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: vi.fn(), getClientIp: vi.fn() }));
vi.mock('@/lib/db', () => ({ getSetting: vi.fn() }));
vi.mock('@/lib/analysis/auth/phone', async () => {
    const actual = await vi.importActual<typeof import('@/lib/analysis/auth/phone')>('@/lib/analysis/auth/phone');
    return { ...actual, generateCode: vi.fn(), hashCode: vi.fn(), smsMessage: vi.fn() };
});
vi.mock('@/lib/analysis/auth/phone-store', () => ({
    insertVerificationIfAllowed: vi.fn(),
    deleteVerification: vi.fn(),
}));
vi.mock('@/lib/analysis/auth/sms', async () => {
    const actual = await vi.importActual<typeof import('@/lib/analysis/auth/sms')>('@/lib/analysis/auth/sms');
    return { ...actual, sendSms: vi.fn() };
});

import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { generateCode, hashCode, smsMessage } from '@/lib/analysis/auth/phone';
import { deleteVerification, insertVerificationIfAllowed } from '@/lib/analysis/auth/phone-store';
import { SmsNotConfiguredError, sendSms } from '@/lib/analysis/auth/sms';
import { POST } from './route';

function req(body: unknown) {
    return new NextRequest('http://localhost/api/analysis/auth/phone/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

const VALID_BODY = { phone: '010-1234-5678', consent: true, ageConfirmed: true };

beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getClientIp).mockReturnValue('1.1.1.1');
    vi.mocked(checkRateLimit).mockReturnValue({ allowed: true, remaining: 9, resetAt: Date.now() + 1000 });
    vi.mocked(generateCode).mockReturnValue('123456');
    vi.mocked(hashCode).mockReturnValue('hash');
    vi.mocked(smsMessage).mockReturnValue('문자 본문');
    vi.mocked(insertVerificationIfAllowed).mockResolvedValue({ id: 1 });
    vi.mocked(deleteVerification).mockResolvedValue(undefined);
    vi.mocked(sendSms).mockResolvedValue(undefined);
});

describe('POST /api/analysis/auth/phone/send', () => {
    it('rate limit에 걸리면 429를 반환하고 발송하지 않는다', async () => {
        vi.mocked(checkRateLimit).mockReturnValue({ allowed: false, remaining: 0, resetAt: Date.now() + 1000 });
        const res = await POST(req(VALID_BODY));
        expect(res.status).toBe(429);
        expect(sendSms).not.toHaveBeenCalled();
    });

    it('입력값이 올바르지 않으면 400 (유선번호/동의 누락)', async () => {
        const res = await POST(req({ phone: '02-123-4567', consent: true, ageConfirmed: true }));
        expect(res.status).toBe(400);
        expect(sendSms).not.toHaveBeenCalled();
    });

    it('동의하지 않으면 400', async () => {
        const res = await POST(req({ phone: '010-1234-5678', consent: false, ageConfirmed: true }));
        expect(res.status).toBe(400);
    });

    it('재발송 간격·일일 한도 판정은 삽입과 원자적으로 처리되며, 삽입되지 않으면(null) 429 "잠시 후 다시 시도해 주세요."', async () => {
        vi.mocked(insertVerificationIfAllowed).mockResolvedValue(null);
        const res = await POST(req(VALID_BODY));
        expect(res.status).toBe(429);
        const json = await res.json();
        expect(json.error).toBe('잠시 후 다시 시도해 주세요.');
        expect(sendSms).not.toHaveBeenCalled();
    });

    it('정상 흐름: 코드 생성 → 원자적 삽입(해시 저장) → 문자 발송 → 200', async () => {
        const res = await POST(req(VALID_BODY));
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json).toMatchObject({ success: true, expiresInSec: 180 });
        expect(hashCode).toHaveBeenCalledWith('01012345678', '123456');
        expect(insertVerificationIfAllowed).toHaveBeenCalledWith('01012345678', 'hash', 180, 60, 5, expect.any(Date));
        expect(sendSms).toHaveBeenCalledWith('01012345678', '문자 본문');
        expect(deleteVerification).not.toHaveBeenCalled();
    });

    it('SMS_PROVIDER 미설정(SmsNotConfiguredError)이면 삽입한 행을 삭제하고 503 "문자 발송이 설정되지 않았습니다."', async () => {
        vi.mocked(sendSms).mockRejectedValue(new SmsNotConfiguredError('설정 없음'));
        const res = await POST(req(VALID_BODY));
        expect(res.status).toBe(503);
        const json = await res.json();
        expect(json.error).toBe('문자 발송이 설정되지 않았습니다.');
        expect(deleteVerification).toHaveBeenCalledWith(1);
    });

    it('문자 발송이 그 외 이유로 실패하면 삽입한 행을 삭제하고 500 "문자 발송에 실패했습니다." (한도 비소진)', async () => {
        vi.mocked(sendSms).mockRejectedValue(new Error('SENS 오류'));
        const res = await POST(req(VALID_BODY));
        expect(res.status).toBe(500);
        const json = await res.json();
        expect(json.error).toBe('문자 발송에 실패했습니다.');
        expect(deleteVerification).toHaveBeenCalledWith(1);
    });

    it('삭제 자체가 실패해도(네트워크 등) 발송 실패 응답은 그대로 반환한다', async () => {
        vi.mocked(sendSms).mockRejectedValue(new Error('SENS 오류'));
        vi.mocked(deleteVerification).mockRejectedValue(new Error('삭제 실패'));
        const res = await POST(req(VALID_BODY));
        expect(res.status).toBe(500);
    });

    it('삽입 쿼리에서 데드락(오류 1205)이 나면 429 "잠시 후 다시 시도해 주세요."로 응답하고 발송하지 않는다', async () => {
        vi.mocked(insertVerificationIfAllowed).mockRejectedValue(Object.assign(new Error('Transaction (Process ID 52) was deadlocked'), { number: 1205 }));
        const res = await POST(req(VALID_BODY));
        expect(res.status).toBe(429);
        const json = await res.json();
        expect(json.error).toBe('잠시 후 다시 시도해 주세요.');
        expect(sendSms).not.toHaveBeenCalled();
    });

    it('삽입 쿼리에서 데드락이 아닌 다른 DB 오류면 500으로 처리한다', async () => {
        vi.mocked(insertVerificationIfAllowed).mockRejectedValue(new Error('커넥션 오류'));
        const res = await POST(req(VALID_BODY));
        expect(res.status).toBe(500);
    });

    it('번호 가입 여부를 노출하지 않는다 — 신규/기존 번호 모두 동일한 응답 형태', async () => {
        const res = await POST(req(VALID_BODY));
        const json = await res.json();
        expect(Object.keys(json).sort()).toEqual(['expiresInSec', 'success']);
    });
});
