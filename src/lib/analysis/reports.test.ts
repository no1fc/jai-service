import { describe, expect, it } from 'vitest';
import { DASHBOARD_TOP_SQL, FRESH_REPORT_SQL } from './reports';

// DB 의존 함수는 단위 테스트 대신, 실제 실행되는 SQL 문자열에 핵심 조건이 포함되는지만 확인한다(leads.test.ts 방식).
describe('FRESH_REPORT_SQL', () => {
    it('만료되지 않은 캐시를 최신순으로 1건만 조회한다', () => {
        expect(FRESH_REPORT_SQL).toContain('expires_at > SYSUTCDATETIME()');
        expect(FRESH_REPORT_SQL).toContain('ORDER BY created_at DESC');
    });
});

describe('DASHBOARD_TOP_SQL', () => {
    it('최근 30일 집계 조건을 포함한다', () => {
        expect(DASHBOARD_TOP_SQL).toContain('DATEADD(day, -30');
    });
});
