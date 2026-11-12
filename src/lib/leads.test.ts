import { describe, expect, it } from 'vitest';
import { PURGE_EXPIRED_LEADS_SQL } from './leads';

// DB 의존 함수(purgeExpiredLeads)는 단위 테스트 대신, 실제 실행되는 SQL 문자열이
// 1년 기준(DATEADD(year, -1)으로 고정돼 있는지만 확인한다.
describe('PURGE_EXPIRED_LEADS_SQL', () => {
    it('created_at이 1년 지난 행을 삭제하는 조건을 포함한다', () => {
        expect(PURGE_EXPIRED_LEADS_SQL).toContain('DATEADD(year, -1');
        expect(PURGE_EXPIRED_LEADS_SQL).toContain('DELETE FROM leads');
    });
});
