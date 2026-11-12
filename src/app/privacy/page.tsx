import Link from "next/link";
import { MoveLeft } from "lucide-react";
import { getSetting } from "@/lib/db";
import { DEFAULT_PRIVACY_POLICY, parsePolicy } from "@/lib/privacy/policy";
import { PolicyView } from "@/components/privacy/PolicyView";
import { logger } from "@/lib/logger";

// 관리자가 언제든 본문을 수정할 수 있으므로 매 요청마다 DB를 조회한다.
export const dynamic = 'force-dynamic';

const DEFAULT_UPDATED_AT = '2026-11-12';

/**
 * 공개 개인정보처리방침 페이지.
 * `system_settings`에 저장된 본문이 있으면 그것을, 없으면 기본 개정본을 렌더한다.
 * DB 조회 실패 시에도 기본 개정본으로 렌더해 페이지가 깨지지 않도록 하고, 에러는 서버 로그로만 남긴다.
 */
export default async function PrivacyPage() {
    let policyText = DEFAULT_PRIVACY_POLICY;
    let updatedAtRaw = DEFAULT_UPDATED_AT;

    try {
        const [savedPolicy, savedUpdatedAt] = await Promise.all([
            getSetting('privacy_policy'),
            getSetting('privacy_policy_updated_at'),
        ]);
        if (savedPolicy) policyText = savedPolicy;
        if (savedUpdatedAt) updatedAtRaw = savedUpdatedAt;
    } catch (error) {
        logger.error('개인정보처리방침 조회 실패, 기본 개정본으로 렌더합니다:', error);
    }

    const blocks = parsePolicy(policyText);

    return (
        <div className="min-h-screen bg-bg text-text p-8 md:p-20 font-mono">
            <nav className="mb-20">
                <Link href="/" className="inline-flex items-center gap-4 text-text-muted hover:text-text transition-colors group">
                    <MoveLeft className="transform group-hover:-translate-x-2 transition-transform" />
                    <span className="font-bold tracking-widest text-xs uppercase">Back to Home</span>
                </Link>
            </nav>

            <main className="max-w-3xl mx-auto pb-40">
                <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">개인정보처리방침</h1>
                <p className="text-accent font-mono text-sm mb-16">최종 수정일: {formatUpdatedAt(updatedAtRaw)}</p>

                <PolicyView blocks={blocks} />
            </main>
        </div>
    );
}

/** ISO 문자열을 Asia/Seoul 기준 YYYY-MM-DD로 변환한다. 이미 그 형식이면 그대로 둔다. */
function formatUpdatedAt(value: string): string {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    // en-CA 로캘은 YYYY-MM-DD 형식을 반환한다.
    return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
}
