import { describe, expect, it } from 'vitest';
import { COMPETENCIES, careerRequestSchema } from './schema';
import { buildCareerPrompt } from './prompt';

const ratings = Object.fromEntries(COMPETENCIES.map(c => [c.key, 3]));
const req = { desiredJob: '웹 개발자', experience: '쇼핑몰 아르바이트 1년, 국비 웹 개발 과정 수료', ratings };

describe('career', () => {
    it('역량은 8개다', () => expect(COMPETENCIES).toHaveLength(8));
    it('정상 요청을 통과시킨다', () => expect(careerRequestSchema.safeParse(req).success).toBe(true));
    it('평가 점수가 1~5를 벗어나면 거부한다', () => {
        expect(careerRequestSchema.safeParse({ ...req, ratings: { ...ratings, communication: 6 } }).success).toBe(false);
    });
    it('역량 항목이 빠지면 거부한다', () => {
        const rest: Record<string, number> = { ...ratings };
        delete rest.communication;
        expect(careerRequestSchema.safeParse({ ...req, ratings: rest }).success).toBe(false);
    });
    it('프롬프트에 직무·경험·역량 점수가 들어간다', () => {
        const p = buildCareerPrompt(careerRequestSchema.parse(req));
        expect(p).toContain('웹 개발자');
        expect(p).toContain('국비 웹 개발 과정');
        expect(p).toContain('의사소통: 3/5');
    });
});
