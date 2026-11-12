import { describe, expect, it } from 'vitest';
import { buildAskPrompt, MAX_HISTORY_MESSAGES } from './prompt';
import { askRequestSchema } from '@/lib/validations';

describe('buildAskPrompt', () => {
    it('지식 문서와 최근 대화 10개만 포함한다', () => {
        const messages = Array.from({ length: 14 }, (_, i) => ({ role: i % 2 ? 'model' : 'user', text: `메시지${i}` } as const));
        const prompt = buildAskPrompt('지식문서본문', messages);
        expect(prompt).toContain('지식문서본문');
        expect(prompt).not.toContain('메시지3');
        expect(prompt).toContain('메시지13');
    });

    it('MAX_HISTORY_MESSAGES는 10이고 buildAskPrompt가 이를 사용한다', () => {
        // 클라이언트(page.tsx)와 서버(prompt.ts)가 같은 기준을 공유하는지 확인
        expect(MAX_HISTORY_MESSAGES).toBe(10);
        const messages = Array.from({ length: MAX_HISTORY_MESSAGES + 1 }, (_, i) => ({ role: i % 2 ? 'model' : 'user', text: `기록${i}` } as const));
        const prompt = buildAskPrompt('문서', messages);
        expect(prompt).not.toContain('기록0');
        expect(prompt).toContain(`기록${MAX_HISTORY_MESSAGES}`);
    });
});

describe('askRequestSchema', () => {
    it('마지막 메시지가 사용자가 아니면 거부한다', () => {
        expect(askRequestSchema.safeParse({ messages: [{ role: 'model', text: '안녕' }] }).success).toBe(false);
    });
    it('500자 초과 메시지는 거부한다', () => {
        expect(askRequestSchema.safeParse({ messages: [{ role: 'user', text: 'a'.repeat(501) }] }).success).toBe(false);
    });
    it('31개 메시지는 한국어 안내 메시지와 함께 거부한다', () => {
        const messages = Array.from({ length: 31 }, (_, i) => ({ role: 'user', text: `질문${i}` } as const));
        const result = askRequestSchema.safeParse({ messages });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues.map(e => e.message)).toContain('대화가 너무 깁니다. 새로고침 후 다시 질문해 주세요.');
        }
    });
});
