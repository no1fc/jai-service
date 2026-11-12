import { describe, expect, it } from 'vitest';
import { buildSensSignature } from './sens-signature';

describe('buildSensSignature', () => {
    it('고정 입력에 대해 항상 같은 서명을 반환한다(회귀 테스트)', () => {
        const sig = buildSensSignature({
            accessKey: 'test-access-key', secretKey: 'test-secret-key',
            method: 'POST', uri: '/sms/v2/services/svc-1/messages', timestamp: '1700000000000',
        });
        expect(sig).toBe('AMy5FxboNWvxyuiTsWgjSBBS3Sve1EoV67C2npPbYfU=');
    });
    it('타임스탬프·URI·키가 다르면 서명도 달라진다', () => {
        const base = { accessKey: 'a', secretKey: 's', method: 'POST' as const, uri: '/x', timestamp: '1' };
        const sig = buildSensSignature(base);
        expect(buildSensSignature({ ...base, timestamp: '2' })).not.toBe(sig);
        expect(buildSensSignature({ ...base, uri: '/y' })).not.toBe(sig);
        expect(buildSensSignature({ ...base, secretKey: 's2' })).not.toBe(sig);
    });
});
