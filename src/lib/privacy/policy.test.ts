import { describe, expect, it } from 'vitest';
import { DEFAULT_PRIVACY_POLICY, hasPlaceholder, parsePolicy } from './policy';

describe('parsePolicy', () => {
    it('## 로 시작하는 줄을 h2 블록으로 변환한다', () => {
        const blocks = parsePolicy('## 제1조 (수집 항목)');
        expect(blocks).toEqual([{ type: 'h2', text: '제1조 (수집 항목)' }]);
    });

    it('### 로 시작하는 줄을 h3 블록으로 변환한다', () => {
        const blocks = parsePolicy('### 가. 세부 항목');
        expect(blocks).toEqual([{ type: 'h3', text: '가. 세부 항목' }]);
    });

    it('연속된 - 항목 줄을 하나의 ul 블록으로 묶는다', () => {
        const blocks = parsePolicy('- a\n- b');
        expect(blocks).toEqual([{ type: 'ul', items: ['a', 'b'] }]);
    });

    it('빈 줄로 분리된 두 문단을 p 블록 2개로 만든다', () => {
        const blocks = parsePolicy('첫 번째 문단\n\n두 번째 문단');
        expect(blocks).toEqual([
            { type: 'p', text: '첫 번째 문단' },
            { type: 'p', text: '두 번째 문단' },
        ]);
    });

    it('빈 줄 없이 이어진 문단 줄은 공백으로 이어붙여 하나의 p 블록이 된다', () => {
        const blocks = parsePolicy('한 줄\n이어지는 줄');
        expect(blocks).toEqual([{ type: 'p', text: '한 줄 이어지는 줄' }]);
    });

    it('<script> 태그가 포함된 줄은 해석하지 않고 텍스트 그대로 p 블록에 보존한다', () => {
        const blocks = parsePolicy('<script>alert(1)</script>');
        expect(blocks).toEqual([{ type: 'p', text: '<script>alert(1)</script>' }]);
    });

    it('CRLF로 줄바꿈된 입력도 LF와 동일하게 파싱한다', () => {
        const lf = parsePolicy('## 제목\r\n\r\n- a\r\n- b\r\n\r\n문단');
        const crlf = parsePolicy('## 제목\n\n- a\n- b\n\n문단');
        expect(lf).toEqual(crlf);
        expect(lf).toEqual([
            { type: 'h2', text: '제목' },
            { type: 'ul', items: ['a', 'b'] },
            { type: 'p', text: '문단' },
        ]);
    });

    it('DEFAULT_PRIVACY_POLICY는 h2가 9개 이상이고 [입력 필요]를 포함한다', () => {
        const blocks = parsePolicy(DEFAULT_PRIVACY_POLICY);
        const h2Count = blocks.filter(b => b.type === 'h2').length;
        expect(h2Count).toBeGreaterThanOrEqual(9);
        expect(hasPlaceholder(DEFAULT_PRIVACY_POLICY)).toBe(true);
    });

    it('DEFAULT_PRIVACY_POLICY는 국외 이전·거부·만 14세·매일 자동 파기 문구를 포함한다', () => {
        expect(DEFAULT_PRIVACY_POLICY).toContain('국외 이전');
        expect(DEFAULT_PRIVACY_POLICY).toContain('거부');
        expect(DEFAULT_PRIVACY_POLICY).toContain('만 14세');
        expect(DEFAULT_PRIVACY_POLICY).toContain('매일 자동');
    });

    it('DEFAULT_PRIVACY_POLICY는 로그인 이용자의 서비스 이용 기록(분석 요청 일시·키워드) 수집 항목을 포함한다', () => {
        expect(DEFAULT_PRIVACY_POLICY).toContain('서비스 이용 기록');
        expect(DEFAULT_PRIVACY_POLICY).toContain('분석 요청 일시·키워드');
    });
});

describe('hasPlaceholder', () => {
    it('[입력 필요]가 있으면 true를 반환한다', () => {
        expect(hasPlaceholder('성명: [입력 필요]')).toBe(true);
    });

    it('[입력 필요]가 없으면 false를 반환한다', () => {
        expect(hasPlaceholder('성명: 홍길동')).toBe(false);
    });
});
