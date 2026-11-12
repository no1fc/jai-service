import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth', () => ({ requireRole: vi.fn() }));
vi.mock('@/lib/db', () => ({ getAllSettings: vi.fn(), getSetting: vi.fn(), updateSetting: vi.fn() }));
vi.mock('@/lib/prompts', () => ({ getPromptCategories: vi.fn(), DEFAULT_INTRO_MESSAGE: [], DEFAULT_INFO_MESSAGE: [] }));
vi.mock('@/lib/qna/knowledge', () => ({ DEFAULT_QNA_KNOWLEDGE: '' }));

import { requireRole } from '@/lib/auth';
import { getAllSettings } from '@/lib/db';
import { getPromptCategories } from '@/lib/prompts';
import { GET } from './route';

const RAW_SETTINGS: Record<string, string> = {
    gemini_api_keys: JSON.stringify(['AAAAAAAAAAAABBBB']),
    work24_api_key: 'work24-secret-0001',
    kakao_rest_api_key: 'kakao-rest-secret-0002',
    kakao_client_secret: 'kakao-client-secret-0003',
    sens_access_key: 'sens-access-secret-0004',
    sens_secret_key: 'sens-secret-secret-0005',
    kakao_redirect_uri: 'http://localhost:3000/api/analysis/auth/kakao/callback',
    sens_service_id: 'ncp:sms:kr:123456789012:service-id',
    sens_sender: '01012345678',
};

beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(requireRole).mockResolvedValue({ id: 'admin1', role: 'admin' });
    vi.mocked(getPromptCategories).mockResolvedValue([]);
    vi.mocked(getAllSettings).mockResolvedValue({ ...RAW_SETTINGS });
});

describe('GET /api/admin/settings - 마스킹', () => {
    it('관리자 인증이 없으면 401을 반환한다', async () => {
        const { NextResponse } = await import('next/server');
        vi.mocked(requireRole).mockResolvedValue(NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 }));
        const res = await GET();
        expect(res.status).toBe(401);
        expect(getAllSettings).not.toHaveBeenCalled();
    });

    it('기존 Gemini 배열 키는 원문이 비워지고 마스킹된 값만 노출된다', async () => {
        const res = await GET();
        const json = await res.json();
        expect(json.settings.gemini_api_keys).toBe('');
        expect(json.settings.gemini_api_keys_masked).toBeDefined();
        expect(json.settings.gemini_api_keys_masked).not.toContain('AAAAAAAAAAAABBBB');
    });

    it.each([
        'work24_api_key',
        'kakao_rest_api_key',
        'kakao_client_secret',
        'sens_access_key',
        'sens_secret_key',
    ])('비밀값 %s는 원문이 비워지고 마스킹된 값만 노출된다', async (key) => {
        const res = await GET();
        const json = await res.json();
        expect(json.settings[key]).toBe('');
        expect(json.settings[`${key}_masked`]).toBeDefined();
        expect(json.settings[`${key}_masked`]).not.toBe(RAW_SETTINGS[key]);
        expect(json.settings[`${key}_masked`]).not.toContain(RAW_SETTINGS[key]);
    });

    it.each(['kakao_redirect_uri', 'sens_service_id', 'sens_sender'])(
        '식별자/URL %s는 마스킹하지 않고 원문 그대로 노출된다',
        async (key) => {
            const res = await GET();
            const json = await res.json();
            expect(json.settings[key]).toBe(RAW_SETTINGS[key]);
            expect(json.settings[`${key}_masked`]).toBeUndefined();
        },
    );
});
