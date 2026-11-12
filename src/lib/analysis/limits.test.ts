import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('./reports', () => ({ countGenerationsToday: vi.fn().mockResolvedValue(0) }));
import { checkDailyLimit } from './limits';
import { countGenerationsToday } from './reports';

describe('checkDailyLimit', () => {
    beforeEach(() => vi.mocked(countGenerationsToday).mockResolvedValue(0));
    it('비로그인은 IP당 3회까지 허용하고 4회째 차단, 메시지에 로그인 안내', async () => {
        const ip = `ip-${Math.random()}`;
        for (let i = 0; i < 3; i++) expect((await checkDailyLimit({ kind: 'anon' }, ip)).allowed).toBe(true);
        const r = await checkDailyLimit({ kind: 'anon' }, ip);
        expect(r.allowed).toBe(false);
        if (!r.allowed) { expect(r.retryAfterSec).toBeGreaterThan(0); expect(r.message).toContain('로그인'); }
    });
    it('로그인 사용자는 DB 카운트 10 이상이면 차단', async () => {
        vi.mocked(countGenerationsToday).mockResolvedValue(10);
        expect((await checkDailyLimit({ kind: 'user', userId: 1 }, `ip-${Math.random()}`)).allowed).toBe(false);
    });
    it('관리자는 30 미만이면 허용', async () => {
        vi.mocked(countGenerationsToday).mockResolvedValue(29);
        expect((await checkDailyLimit({ kind: 'admin', username: 'a' }, `ip-${Math.random()}`)).allowed).toBe(true);
    });
});
