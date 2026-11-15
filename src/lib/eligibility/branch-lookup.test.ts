import { describe, expect, it } from 'vitest';
import { shouldLookupBranch } from './branch-lookup';
import type { DiagnosisResult } from '@/types/chat';

const restricted: DiagnosisResult = { type: '제한', description: '', restrictReason: '재학 중' };
const type1: DiagnosisResult = { type: '1유형_선발형', description: '' };

describe('shouldLookupBranch', () => {
    it('결과가 제한이어도 지점을 조회한다(Bug B 회귀)', () => {
        expect(shouldLookupBranch('result', 'none', restricted)).toBe(true);
    });
    it('일반 결과도 조회한다', () => { expect(shouldLookupBranch('result', 'none', type1)).toBe(true); });
    it('이미 조회 중/완료면 다시 조회하지 않는다', () => {
        expect(shouldLookupBranch('result', 'loading', type1)).toBe(false);
        expect(shouldLookupBranch('result', null, type1)).toBe(false);
    });
    it('결과 단계가 아니거나 결과가 없으면 조회하지 않는다', () => {
        expect(shouldLookupBranch('questioning', 'none', type1)).toBe(false);
        expect(shouldLookupBranch('result', 'none', null)).toBe(false);
    });
});
