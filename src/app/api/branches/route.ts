/**
 * GET /api/branches - 지점 조회 API Route
 * 사용자 지역(시/도, 시/군/구)을 받아 잡모아 지점 정보를 반환합니다.
 * 매칭 지점이 없으면 null을 반환하여 고용24 안내를 유도합니다.
 */

import { type NextRequest } from 'next/server';
import { getBranchByRegion, getAllBranches } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const sido = searchParams.get('sido');
        const sigungu = searchParams.get('sigungu');

        if (!sido || !sigungu) {
            const branches = await getAllBranches();
            return apiSuccess({ branches });
        }

        const branch = await getBranchByRegion(sido, sigungu);
        return apiSuccess({ branch });
    } catch (error) {
        logger.error('/api/branches 오류:', error);
        return apiError('지점 조회 중 오류가 발생했습니다.');
    }
}
