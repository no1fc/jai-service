import { describe, expect, it } from 'vitest';
import { ALL_PROGRAMS, filterPrograms, PROGRAM_MAP } from './programs';
import { COMPETENCIES } from './schema';

describe('programs', () => {
    it('8개 역량 모두 1~3개의 후보를 가진다', () => {
        for (const { key } of COMPETENCIES) {
            expect(PROGRAM_MAP[key].length).toBeGreaterThanOrEqual(1);
            expect(PROGRAM_MAP[key].length).toBeLessThanOrEqual(3);
        }
    });

    it('ALL_PROGRAMS는 PROGRAM_MAP에 등장하는 값을 모두 포함한다', () => {
        for (const { key } of COMPETENCIES) {
            for (const program of PROGRAM_MAP[key]) {
                expect(ALL_PROGRAMS).toContain(program);
            }
        }
    });

    it('filterPrograms는 목록 안의 값만 순서를 유지해 최대 2개 남긴다', () => {
        const result = filterPrograms('communication', ['면접 컨설팅', '없는 값', '취업역량 강화 프로그램']);
        expect(result).toHaveLength(2);
        expect(result).toEqual(
            ['면접 컨설팅', '없는 값', '취업역량 강화 프로그램'].filter(v => PROGRAM_MAP.communication.includes(v)).slice(0, 2),
        );
    });

    it('filterPrograms는 목록 밖 값을 제거한다', () => {
        const result = filterPrograms('communication', ['없는 값']);
        expect(result).toHaveLength(0);
    });
});
