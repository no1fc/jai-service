import { describe, expect, test } from 'vitest';
import { buildKakaoRedirectUri } from './redirect-uri';

describe('buildKakaoRedirectUri', () => {
    test('https 운영 주소를 그대로 조립한다', () => {
        // Arrange
        const proto = 'https';
        const host = 'example.com';

        // Act
        const uri = buildKakaoRedirectUri(proto, host);

        // Assert
        expect(uri).toBe('https://example.com/api/analysis/auth/kakao/callback');
    });

    test('http 개발 주소를 그대로 조립한다', () => {
        // Arrange & Act
        const uri = buildKakaoRedirectUri('http', 'localhost:3000');

        // Assert
        expect(uri).toBe('http://localhost:3000/api/analysis/auth/kakao/callback');
    });

    test('proto가 없으면 http로 대체한다', () => {
        // Arrange & Act
        const uri = buildKakaoRedirectUri(null, 'example.com');

        // Assert
        expect(uri).toBe('http://example.com/api/analysis/auth/kakao/callback');
    });

    test('포트가 포함된 host를 그대로 보존한다', () => {
        // Arrange & Act
        const uri = buildKakaoRedirectUri('http', '127.0.0.1:4000');

        // Assert
        expect(uri).toBe('http://127.0.0.1:4000/api/analysis/auth/kakao/callback');
    });
});
