import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('@/lib/auth', () => ({ requireRole: vi.fn() }));
vi.mock('@/lib/analysis/users', () => ({ getUserById: vi.fn(), updatePassword: vi.fn() }));
vi.mock('@/lib/analysis/auth/local', async () => {
    const actual = await vi.importActual<typeof import('@/lib/analysis/auth/local')>('@/lib/analysis/auth/local');
    return { ...actual, generateTempPassword: vi.fn(), hashPassword: vi.fn() };
});
vi.mock('@/lib/access-log', () => ({ logAdminAccess: vi.fn() }));
vi.mock('@/lib/rate-limit', () => ({ getClientIp: vi.fn() }));

import { getUserById, updatePassword } from '@/lib/analysis/users';
import { generateTempPassword, hashPassword } from '@/lib/analysis/auth/local';
import { requireRole } from '@/lib/auth';
import { logAdminAccess } from '@/lib/access-log';
import { getClientIp } from '@/lib/rate-limit';
import { POST } from './route';

function req() {
    return new NextRequest('http://localhost/api/admin/app-users/7/reset-password', { method: 'POST' });
}
function ctx(id: string) {
    return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getClientIp).mockReturnValue('1.1.1.1');
});

describe('POST /api/admin/app-users/[id]/reset-password', () => {
    it('관리자 인증이 없으면 401을 반환한다', async () => {
        vi.mocked(requireRole).mockResolvedValue(NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 }));
        const res = await POST(req(), ctx('7'));
        expect(res.status).toBe(401);
        expect(updatePassword).not.toHaveBeenCalled();
    });

    it('ID가 숫자가 아니면 400을 반환한다', async () => {
        vi.mocked(requireRole).mockResolvedValue({ id: 'admin1', role: 'admin' });
        const res = await POST(req(), ctx('abc'));
        expect(res.status).toBe(400);
    });

    it('대상이 없으면 404를 반환한다', async () => {
        vi.mocked(requireRole).mockResolvedValue({ id: 'admin1', role: 'admin' });
        vi.mocked(getUserById).mockResolvedValue(null);
        const res = await POST(req(), ctx('7'));
        expect(res.status).toBe(404);
        expect(updatePassword).not.toHaveBeenCalled();
    });

    it('카카오 계정이면 404를 반환한다(로컬 계정만 초기화)', async () => {
        vi.mocked(requireRole).mockResolvedValue({ id: 'admin1', role: 'admin' });
        vi.mocked(getUserById).mockResolvedValue({ id: 7, provider: 'kakao', provider_id: '1', email: null } as never);
        const res = await POST(req(), ctx('7'));
        expect(res.status).toBe(404);
        expect(updatePassword).not.toHaveBeenCalled();
    });

    it('성공하면 임시 비밀번호를 1회 반환하고 updatePassword(id, hash, true)·접속기록을 남긴다', async () => {
        vi.mocked(requireRole).mockResolvedValue({ id: 'admin1', role: 'admin' });
        vi.mocked(getUserById).mockResolvedValue({ id: 7, provider: 'local', provider_id: 'foo@bar.com', email: 'foo@bar.com' } as never);
        vi.mocked(generateTempPassword).mockReturnValue('Temp12345678');
        vi.mocked(hashPassword).mockResolvedValue('HASH');

        const res = await POST(req(), ctx('7'));
        expect(res.status).toBe(200);
        expect(updatePassword).toHaveBeenCalledWith(7, 'HASH', true);
        expect(logAdminAccess).toHaveBeenCalledWith(expect.objectContaining({ action: 'app_user_reset_password', targetId: 7, adminUsername: 'admin1' }));
        const json = await res.json();
        expect(json).toEqual({ success: true, tempPassword: 'Temp12345678' });
        expect(JSON.stringify(json)).not.toContain('HASH');
    });
});
