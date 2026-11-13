import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({ verifyToken: vi.fn() }));

import { verifyToken } from '@/lib/auth';
import { GET } from './route';

function req(cookieValue?: string) {
    return new NextRequest('http://localhost/api/admin/me', {
        headers: cookieValue ? { cookie: `admin_session=${cookieValue}` } : undefined,
    });
}

beforeEach(() => {
    vi.resetAllMocks();
});

describe('GET /api/admin/me', () => {
    it('쿠키가 없으면 401', async () => {
        const res = await GET(req());
        expect(res.status).toBe(401);
    });

    it('토큰이 유효하지 않으면 401', async () => {
        vi.mocked(verifyToken).mockResolvedValue(null);
        const res = await GET(req('bad'));
        expect(res.status).toBe(401);
    });

    it('role이 admin/superadmin이 아니면 403', async () => {
        vi.mocked(verifyToken).mockResolvedValue({ id: 'u1', role: 'user' } as never);
        const res = await GET(req('tok'));
        expect(res.status).toBe(403);
        const json = await res.json();
        expect(json).toEqual({ success: false, error: '관리자 권한이 필요합니다.' });
    });

    it('role이 admin이면 200과 사용자 정보를 반환한다', async () => {
        vi.mocked(verifyToken).mockResolvedValue({ id: 'admin1', role: 'admin' } as never);
        const res = await GET(req('tok'));
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json).toEqual({ success: true, user: { username: 'admin1', role: 'admin' } });
    });

    it('role이 superadmin이면 200', async () => {
        vi.mocked(verifyToken).mockResolvedValue({ id: 'super1', role: 'superadmin' } as never);
        const res = await GET(req('tok'));
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.user.role).toBe('superadmin');
    });

    it('role이 비어 있으면(레거시 토큰) admin으로 간주해 허용한다', async () => {
        vi.mocked(verifyToken).mockResolvedValue({ id: 'legacy1', role: '' } as never);
        const res = await GET(req('tok'));
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.user.role).toBe('admin');
    });
});
