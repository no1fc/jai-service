import { describe, expect, it } from 'vitest';
import { buildAskPrompt } from './prompt';
import { askRequestSchema } from '@/lib/validations';

describe('buildAskPrompt', () => {
    it('지식 문서와 최근 대화 10개만 포함한다', () => {
        const messages = Array.from({ length: 14 }, (_, i) => ({ role: i % 2 ? 'model' : 'user', text: `메시지${i}` } as const));
        const prompt = buildAskPrompt('지식문서본문', messages);
        expect(prompt).toContain('지식문서본문');
        expect(prompt).not.toContain('메시지3');
        expect(prompt).toContain('메시지13');
    });
});

describe('askRequestSchema', () => {
    it('마지막 메시지가 사용자가 아니면 거부한다', () => {
        expect(askRequestSchema.safeParse({ messages: [{ role: 'model', text: '안녕' }] }).success).toBe(false);
    });
    it('500자 초과 메시지는 거부한다', () => {
        expect(askRequestSchema.safeParse({ messages: [{ role: 'user', text: 'a'.repeat(501) }] }).success).toBe(false);
    });
});
