/**
 * 인메모리 Rate Limiter
 * IP 기반으로 요청 횟수를 제한합니다.
 * 프로덕션에서는 Redis 기반으로 교체 권장.
 */

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// 오래된 엔트리를 주기적으로 정리 (메모리 누수 방지)
const CLEANUP_INTERVAL = 60 * 1000; // 1분
let lastCleanup = Date.now();

function cleanup() {
    const now = Date.now();
    if (now - lastCleanup < CLEANUP_INTERVAL) return;
    lastCleanup = now;

    for (const [key, entry] of store) {
        if (now > entry.resetAt) {
            store.delete(key);
        }
    }
}

interface RateLimitConfig {
    /** 윈도우 내 허용 최대 요청 수 */
    maxRequests: number;
    /** 윈도우 크기 (밀리초) */
    windowMs: number;
}

interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: number;
}

/**
 * Rate limit 체크.
 * @param key 식별자 (보통 IP 주소)
 * @param config 제한 설정
 * @returns allowed=true이면 요청 허용, false이면 차단
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
    cleanup();
    const now = Date.now();
    const entry = store.get(key);

    // 윈도우가 없거나 만료되었으면 새로 생성
    if (!entry || now > entry.resetAt) {
        const newEntry: RateLimitEntry = {
            count: 1,
            resetAt: now + config.windowMs,
        };
        store.set(key, newEntry);
        return { allowed: true, remaining: config.maxRequests - 1, resetAt: newEntry.resetAt };
    }

    // 윈도우 내에서 카운트 증가
    entry.count += 1;

    if (entry.count > config.maxRequests) {
        return { allowed: false, remaining: 0, resetAt: entry.resetAt };
    }

    return { allowed: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt };
}

/**
 * 요청에서 IP 주소를 추출합니다.
 * x-real-ip 우선, 없으면 x-forwarded-for의 첫 번째 값, 최종 fallback은 'unknown'.
 *
 * 주의: 이 판별은 Nginx 리버스 프록시가 `X-Real-IP $remote_addr`를 직접 설정해 주는
 * 배포 환경(배포.md 참고)에서만 신뢰할 수 있다. 프록시 없이 앱에 직접 접근 가능하면
 * 클라이언트가 두 헤더 모두 임의로 조작할 수 있으므로 신뢰해서는 안 된다.
 */
export function getClientIp(request: Request): string {
    const realIp = request.headers.get('x-real-ip');
    if (realIp) return realIp.trim();

    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    return 'unknown';
}
