import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import type { ConnectionPool } from 'mssql';

vi.mock('@/lib/auth', () => ({ requireRole: vi.fn() }));
vi.mock('@/lib/analysis/reports');
vi.mock('@/lib/db', () => ({ getPool: vi.fn() }));

import { requireRole } from '@/lib/auth';
import { getReportById, toPublicReport } from '@/lib/analysis/reports';
import { getPool } from '@/lib/db';
import { GET } from './route';

function ctx(id: string) {
    return { params: Promise.resolve({ id }) };
}

/** analysis_requests 요약 쿼리 1건만 응답하는 가짜 풀. */
function fakePool(summary: { c: number; last: Date | null }) {
    const request = () => ({
        input() { return this; },
        async query() { return { recordset: [summary] }; },
    });
    return { request } as unknown as ConnectionPool;
}

beforeEach(() => {
    vi.resetAllMocks();
});

describe('GET /api/admin/analysis/reports/[id]', () => {
    it('관리자 인증이 없으면 401을 반환한다', async () => {
        vi.mocked(requireRole).mockResolvedValue(NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 }));
        const res = await GET({} as NextRequest, ctx('1'));
        expect(res.status).toBe(401);
        expect(getReportById).not.toHaveBeenCalled();
    });

    it('id가 정수가 아니면 400을 반환한다', async () => {
        vi.mocked(requireRole).mockResolvedValue({ id: 'admin1', role: 'admin' });
        const res = await GET({} as NextRequest, ctx('abc'));
        expect(res.status).toBe(400);
        expect(getReportById).not.toHaveBeenCalled();
    });

    it('리포트가 없으면 404를 반환한다', async () => {
        vi.mocked(requireRole).mockResolvedValue({ id: 'admin1', role: 'admin' });
        vi.mocked(getReportById).mockResolvedValue(null);
        const res = await GET({} as NextRequest, ctx('999'));
        expect(res.status).toBe(404);
    });

    it('정상 조회 시 리포트와 요청 이력 요약을 반환한다', async () => {
        vi.mocked(requireRole).mockResolvedValue({ id: 'admin1', role: 'admin' });
        const row = { id: 7, include_competitors: true, include_trends: false } as never;
        vi.mocked(getReportById).mockResolvedValue(row);
        vi.mocked(toPublicReport).mockReturnValue({ publicId: 'uuid' } as never);
        vi.mocked(getPool).mockResolvedValue(fakePool({ c: 3, last: new Date('2026-01-01T00:00:00.000Z') }));

        const res = await GET({} as NextRequest, ctx('7'));
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json).toEqual({
            success: true,
            report: { publicId: 'uuid' },
            id: 7,
            includeCompetitors: true,
            includeTrends: false,
            requestSummary: { count: 3, lastRequestedAt: '2026-01-01T00:00:00.000Z' },
        });
    });
});
