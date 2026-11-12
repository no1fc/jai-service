import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGet = vi.fn();
vi.mock('next/headers', () => ({ cookies: () => Promise.resolve({ get: mockGet }) }));

import { signToken } from '@/lib/auth';
import { actorFromRequest, getCurrentUser } from './user-session';

beforeEach(() => {
    vi.stubEnv('JWT_SECRET_KEY', 'test-secret-key-for-user-session');
    mockGet.mockReset();
});

describe('getCurrentUser', () => {
    it('role=user 토큰이면 사용자 id를 반환한다', async () => {
        const token = await signToken({ id: '7', role: 'user' });
        mockGet.mockReturnValue({ value: token });
        await expect(getCurrentUser()).resolves.toEqual({ id: 7 });
    });
    it('role=admin 토큰이면 null을 반환한다', async () => {
        const token = await signToken({ id: 'admin1', role: 'admin' });
        mockGet.mockReturnValue({ value: token });
        await expect(getCurrentUser()).resolves.toBeNull();
    });
    it('쿠키가 없으면 null을 반환한다', async () => {
        mockGet.mockReturnValue(undefined);
        await expect(getCurrentUser()).resolves.toBeNull();
    });
});

describe('actorFromRequest', () => {
    it('로그인 사용자면 user Actor를 반환한다', async () => {
        const token = await signToken({ id: '7', role: 'user' });
        mockGet.mockReturnValue({ value: token });
        await expect(actorFromRequest()).resolves.toEqual({ kind: 'user', userId: 7 });
    });
    it('비로그인이면 anon Actor를 반환한다', async () => {
        mockGet.mockReturnValue(undefined);
        await expect(actorFromRequest()).resolves.toEqual({ kind: 'anon' });
    });
});
