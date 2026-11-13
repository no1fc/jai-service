import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('@/lib/auth', () => ({ requireRole: vi.fn() }));
vi.mock('@/lib/analysis/users', () => ({ findLocalUserByEmail: vi.fn() }));
vi.mock('@/lib/access-log', () => ({ logAdminAccess: vi.fn() }));
vi.mock('@/lib/rate-limit', () => ({ getClientIp: vi.fn() }));

import { requireRole } from '@/lib/auth';
import { findLocalUserByEmail } from '@/lib/analysis/users';
import { logAdminAccess } from '@/lib/access-log';
import { getClientIp } from '@/lib/rate-limit';
import { GET } from './route';

function req(qs: string) {
    return new NextRequest(`http://localhost/api/admin/app-users${qs}`);
}

beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getClientIp).mockReturnValue('1.1.1.1');
});

describe('GET /api/admin/app-users', () => {
    it('관리자 인증이 없으면 401을 반환한다', async () => {
        vi.mocked(requireRole).mockResolvedValue(NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 }));
        const res = await GET(req('?email=foo@bar.com'));
        expect(res.status).toBe(401);
        expect(findLocalUserByEmail).not.toHaveBeenCalled();
    });

    it('이메일 형식이 아니면 400을 반환한다', async () => {
        vi.mocked(requireRole).mockResolvedValue({ id: 'admin1', role: 'admin' });
        const res = await GET(req('?email=not-an-email'));
        expect(res.status).toBe(400);
        expect(findLocalUserByEmail).not.toHaveBeenCalled();
    });

    it('결과가 없으면 user: null을 반환하고 접속기록을 남긴다', async () => {
        vi.mocked(requireRole).mockResolvedValue({ id: 'admin1', role: 'admin' });
        vi.mocked(findLocalUserByEmail).mockResolvedValue(null);
        const res = await GET(req('?email=foo@bar.com'));
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json).toEqual({ success: true, user: null });
        expect(logAdminAccess).toHaveBeenCalledWith(expect.objectContaining({ action: 'app_user_search', adminUsername: 'admin1' }));
    });

    it('결과가 있으면 이메일을 마스킹해 반환한다', async () => {
        vi.mocked(requireRole).mockResolvedValue({ id: 'admin1', role: 'admin' });
        const createdAt = new Date('2026-01-01T00:00:00Z');
        const lastLoginAt = new Date('2026-02-01T00:00:00Z');
        vi.mocked(findLocalUserByEmail).mockResolvedValue({
            id: 7, provider: 'local', provider_id: 'foo@bar.com', email: 'foo@bar.com',
            must_change_password: false, consent_at: createdAt, created_at: createdAt, last_login_at: lastLoginAt,
            password_hash: 'HASH', failed_attempts: 0, locked_until: null, password_updated_at: null,
        } as never);
        const res = await GET(req('?email=foo@bar.com'));
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json).toEqual({
            success: true,
            user: {
                id: 7, emailMasked: 'f***@bar.com', provider: 'local',
                createdAt: createdAt.toISOString(), lastLoginAt: lastLoginAt.toISOString(), isLocked: false,
            },
        });
        expect(JSON.stringify(json)).not.toContain('HASH');
        expect(logAdminAccess).toHaveBeenCalledWith(expect.objectContaining({ action: 'app_user_search', targetId: 7 }));
    });

    it('잠금 중인 계정은 isLocked: true를 반환한다', async () => {
        vi.mocked(requireRole).mockResolvedValue({ id: 'admin1', role: 'admin' });
        vi.mocked(findLocalUserByEmail).mockResolvedValue({
            id: 7, provider: 'local', provider_id: 'foo@bar.com', email: 'foo@bar.com',
            must_change_password: false, consent_at: new Date(), created_at: new Date(), last_login_at: new Date(),
            password_hash: 'HASH', failed_attempts: 5, locked_until: new Date(Date.now() + 60_000), password_updated_at: null,
        } as never);
        const res = await GET(req('?email=foo@bar.com'));
        const json = await res.json();
        expect(json.user.isLocked).toBe(true);
    });
});
