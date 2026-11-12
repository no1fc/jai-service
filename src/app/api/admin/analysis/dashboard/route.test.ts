import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

vi.mock('@/lib/auth', () => ({ requireRole: vi.fn() }));
vi.mock('@/lib/analysis/reports');

import { requireRole } from '@/lib/auth';
import { getDashboard, listReports } from '@/lib/analysis/reports';
import { GET } from './route';

const stats = {
    today: 1, last7d: 5, cacheHitRate: 0.5,
    recent: [], topJobs: [], topIndustries: [],
};

beforeEach(() => {
    vi.resetAllMocks();
});

describe('GET /api/admin/analysis/dashboard', () => {
    it('관리자 인증이 없으면 401을 반환하고 조회하지 않는다', async () => {
        vi.mocked(requireRole).mockResolvedValue(NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 }));
        const res = await GET();
        expect(res.status).toBe(401);
        expect(getDashboard).not.toHaveBeenCalled();
    });

    it('인증되면 대시보드 통계와 전체 리포트 수를 반환한다', async () => {
        vi.mocked(requireRole).mockResolvedValue({ id: 'admin1', role: 'admin' });
        vi.mocked(getDashboard).mockResolvedValue(stats as never);
        vi.mocked(listReports).mockResolvedValue([{ id: 1 } as never, { id: 2 } as never]);

        const res = await GET();
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json).toEqual({ success: true, stats, totalReports: 2 });
    });
});
