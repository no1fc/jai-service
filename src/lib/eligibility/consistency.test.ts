import { describe, expect, it } from 'vitest';
import { answerLabel, checkConsistency } from './consistency';

const ids = (a: Record<string, string>) => checkConsistency(a).map(c => c.id);

describe('checkConsistency', () => {
    it('C1: 18세 미만 + 병역 이행', () => {
        expect(ids({ age: '17', militaryMonths: '12' })).toEqual(['C1']);
        expect(ids({ age: '18', militaryMonths: '12' })).toEqual([]);
        expect(ids({ age: '17', militaryMonths: '0' })).toEqual([]);
    });
    it('C2: 18세 미만 + 군 복무 중', () => {
        expect(ids({ age: '16', excluded: 'military' })).toEqual(['C2']);
    });
    it('C3: 근로 중 + 최근 2년 일한 기간 없음', () => {
        expect(ids({ status: 'employed30', workDays: 'none' })).toEqual(['C3']);
        expect(ids({ status: 'employedPart', workDays: 'none' })).toEqual(['C3']);
        expect(ids({ status: 'employed30', workDays: 'under30' })).toEqual([]);
        expect(ids({ status: 'unemployed', workDays: 'none' })).toEqual([]);
    });
    it('C4: 근로 중 + 군 복무/수감', () => {
        expect(ids({ status: 'employed30', excluded: 'prison' })).toEqual(['C4']);
        expect(ids({ status: 'employedPart', excluded: 'military' })).toEqual(['C4']);
        expect(ids({ status: 'employed30', excluded: 'livelihood' })).toEqual([]);
    });
    it('C5: 1인 가구 + 미취학 자녀', () => {
        expect(ids({ familySize: '1', hasPreschoolChild: 'yes' })).toEqual(['C5']);
        expect(ids({ familySize: '2', hasPreschoolChild: 'yes' })).toEqual([]);
    });
    it('C6(warn): 주 30시간 이상 근로 + 소득 0', () => {
        const [c] = checkConsistency({ status: 'employed30', monthlyIncome: '0' });
        expect(c.id).toBe('C6'); expect(c.level).toBe('warn');
        expect(ids({ status: 'employedPart', monthlyIncome: '0' })).toEqual([]);
    });
    it('C7(warn): 생계급여 + 중위 60% 초과 (1인 2,564,238원 → 160만 원은 62%)', () => {
        expect(ids({ excluded: 'livelihood', familySize: '1', monthlyIncome: '160' })).toEqual(['C7']);
        expect(ids({ excluded: 'livelihood', familySize: '1', monthlyIncome: '150' })).toEqual([]);
    });
    it('미답변 질문이 포함된 규칙은 평가하지 않는다', () => {
        expect(ids({ age: '17' })).toEqual([]);
        expect(ids({})).toEqual([]);
    });
    it('여러 모순을 동시에 반환하고 questions는 규칙 순서대로다', () => {
        const r = checkConsistency({ age: '17', militaryMonths: '36', familySize: '1', hasPreschoolChild: 'yes' });
        expect(r.map(c => c.id)).toEqual(['C1', 'C5']);
        expect(r[0].questions).toEqual(['age', 'militaryMonths']);
    });
});

describe('answerLabel', () => {
    it('선택지 라벨·숫자·지역을 사람이 읽는 문구로 바꾼다', () => {
        expect(answerLabel('status', 'employed30')).toBe('주 30시간 이상 근로 중');
        expect(answerLabel('age', '17')).toBe('만 17세');
        expect(answerLabel('monthlyIncome', '0')).toBe('0만 원');
        expect(answerLabel('region', '서울특별시 양천구')).toBe('서울특별시 양천구');
        expect(answerLabel('status', 'zzz')).toBe('zzz');
    });
});
