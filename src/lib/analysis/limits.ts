/** 일일 생성 한도 — 캐시 미스에만 적용. IP·전체는 메모리(재시작 시 초기화, JAI-03 참고), 사용자·관리자는 DB 카운트. */
import { checkRateLimit } from '@/lib/rate-limit';
import { DAILY_LIMITS } from './schema';
import { countGenerationsToday, type Actor } from './reports';

const DAY_MS = 24 * 60 * 60 * 1000;
const deny = (resetAt: number, message: string) => ({ allowed: false as const, retryAfterSec: Math.max(1, Math.ceil((resetAt - Date.now()) / 1000)), message });

export async function checkDailyLimit(actor: Actor, ip: string) {
    const global = checkRateLimit('analysis:global', { maxRequests: DAILY_LIMITS.global, windowMs: DAY_MS });
    if (!global.allowed) return deny(global.resetAt, '오늘 분석 생성 한도에 도달했습니다. 내일 다시 이용해 주세요.');
    if (actor.kind === 'anon') {
        const r = checkRateLimit(`analysis:ip:${ip}`, { maxRequests: DAILY_LIMITS.anon, windowMs: DAY_MS });
        return r.allowed ? { allowed: true as const } : deny(r.resetAt, `비로그인은 하루 ${DAILY_LIMITS.anon}회까지 생성할 수 있습니다. 로그인하면 하루 ${DAILY_LIMITS.user}회까지 가능합니다.`);
    }
    const used = await countGenerationsToday(actor);
    const max = actor.kind === 'user' ? DAILY_LIMITS.user : DAILY_LIMITS.admin;
    return used < max ? { allowed: true as const } : deny(Date.now() + DAY_MS, `하루 ${max}회 생성 한도에 도달했습니다. 24시간 후 다시 이용해 주세요.`);
}
