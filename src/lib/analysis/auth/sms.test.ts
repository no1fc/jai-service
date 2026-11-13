import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/db', () => ({ getSetting: vi.fn() }));
import { getSetting } from '@/lib/db';
import { logger } from '@/lib/logger';
import { SmsNotConfiguredError, sendSms } from './sms';

const SENS_SETTINGS: Record<string, string> = {
    sens_access_key: 'AK',
    sens_secret_key: 'SK',
    sens_service_id: 'svc-1',
    sens_sender: '01000000000',
};

describe('sendSms', () => {
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.resetAllMocks();
        fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 202 });
        vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
    });

    it('SMS_PROVIDER=log면 번호를 마스킹해 경고 로그를 남기고 fetch는 호출하지 않는다', async () => {
        vi.stubEnv('SMS_PROVIDER', 'log');
        const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);

        await sendSms('01012345678', '[J.AI] 인증번호 123456 (3분 내 입력)');

        expect(warnSpy).toHaveBeenCalledTimes(1);
        const logged = warnSpy.mock.calls[0].join(' ');
        expect(logged).toContain('010****5678');
        expect(logged).not.toContain('01012345678');
        expect(logged).toContain('123456'); // 개발 로그 모드는 인증 코드를 남길 수 있다.
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('SMS_PROVIDER 미설정이면 log 모드와 동일하게 동작한다', async () => {
        vi.stubEnv('SMS_PROVIDER', '');
        const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);

        await sendSms('01012345678', 'text');

        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('SMS_PROVIDER=sens인데 설정값이 하나라도 없으면 throw하고 fetch하지 않는다', async () => {
        vi.stubEnv('SMS_PROVIDER', 'sens');
        vi.mocked(getSetting).mockImplementation(async (key: string) => (key === 'sens_secret_key' ? null : SENS_SETTINGS[key] ?? null));

        await expect(sendSms('01012345678', 'text')).rejects.toThrow();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('자격증명이 모두 있으면 서명·타임아웃 signal 헤더를 포함해 SENS API를 호출한다', async () => {
        vi.stubEnv('SMS_PROVIDER', 'sens');
        vi.mocked(getSetting).mockImplementation(async (key: string) => SENS_SETTINGS[key] ?? null);

        await sendSms('01012345678', 'text');

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, init] = fetchMock.mock.calls[0];
        expect(String(url)).toBe('https://sens.apigw.ntruss.com/sms/v2/services/svc-1/messages');
        expect(init.headers['x-ncp-apigw-signature-v2']).toBeTypeOf('string');
        expect(init.headers['x-ncp-iam-access-key']).toBe('AK');
        expect(init.headers['x-ncp-apigw-timestamp']).toBeTypeOf('string');
        expect(init.signal).toBeInstanceOf(AbortSignal); // 5초 타임아웃 signal이 실제로 전달되는지 확인
        const body = JSON.parse(init.body);
        expect(body).toMatchObject({ type: 'SMS', contentType: 'COMM', countryCode: '82', from: '01000000000', content: 'text', messages: [{ to: '01012345678' }] });
    });

    it('SENS 응답이 2xx가 아니면 throw한다', async () => {
        vi.stubEnv('SMS_PROVIDER', 'sens');
        vi.mocked(getSetting).mockImplementation(async (key: string) => SENS_SETTINGS[key] ?? null);
        fetchMock.mockResolvedValue({ ok: false, status: 400 });

        await expect(sendSms('01012345678', 'text')).rejects.toThrow();
    });

    it('운영(NODE_ENV=production)에서 SMS_PROVIDER 미설정이면 코드를 로그로 남기지 않고 SmsNotConfiguredError를 던진다', async () => {
        vi.stubEnv('NODE_ENV', 'production');
        vi.stubEnv('SMS_PROVIDER', '');
        const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);

        await expect(sendSms('01012345678', '[J.AI] 인증번호 123456 (3분 내 입력)')).rejects.toThrow(SmsNotConfiguredError);

        expect(warnSpy).not.toHaveBeenCalled();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('운영에서 SMS_PROVIDER=log여도 SmsNotConfiguredError를 던진다', async () => {
        vi.stubEnv('NODE_ENV', 'production');
        vi.stubEnv('SMS_PROVIDER', 'log');

        await expect(sendSms('01012345678', 'text')).rejects.toThrow(SmsNotConfiguredError);
    });
});
