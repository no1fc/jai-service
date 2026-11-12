import { describe, expect, it } from 'vitest';
import { checkRateLimit, getClientIp } from './rate-limit';

function reqWithHeaders(headers: Record<string, string>): Request {
    return new Request('http://localhost/api/test', { headers });
}

describe('getClientIp', () => {
    it('x-real-ip가 있으면 이를 우선 사용한다', () => {
        const req = reqWithHeaders({ 'x-real-ip': '1.1.1.1', 'x-forwarded-for': '2.2.2.2, 3.3.3.3' });
        expect(getClientIp(req)).toBe('1.1.1.1');
    });
    it('x-real-ip가 없으면 x-forwarded-for의 첫 번째 값을 사용한다', () => {
        const req = reqWithHeaders({ 'x-forwarded-for': '2.2.2.2, 3.3.3.3' });
        expect(getClientIp(req)).toBe('2.2.2.2');
    });
    it('둘 다 없으면 unknown을 반환한다', () => {
        expect(getClientIp(reqWithHeaders({}))).toBe('unknown');
    });
});

describe('checkRateLimit', () => {
    it('윈도우 내 요청 수가 한도를 넘으면 차단한다', () => {
        const key = `test:${Math.random()}`;
        const config = { maxRequests: 2, windowMs: 60_000 };
        expect(checkRateLimit(key, config).allowed).toBe(true);
        expect(checkRateLimit(key, config).allowed).toBe(true);
        expect(checkRateLimit(key, config).allowed).toBe(false);
    });
});
