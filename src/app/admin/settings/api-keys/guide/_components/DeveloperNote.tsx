import React from 'react';
import { Code2 } from 'lucide-react';

const SETTING_KEYS: Array<{ label: string; key: string; kind: string }> = [
    { label: '고용24 인증키', key: 'work24_api_key', kind: '비밀값' },
    { label: '카카오 REST API 키', key: 'kakao_rest_api_key', kind: '비밀값' },
    { label: '카카오 Client Secret', key: 'kakao_client_secret', kind: '비밀값' },
    { label: '카카오 Redirect URI', key: 'kakao_redirect_uri', kind: '식별자' },
];

/**
 * 비개발자용 본문과 분리한 기술 참고 블록 — 설정 키 이름, 개발 매뉴얼 링크.
 * 기본은 접힌 상태.
 */
export function DeveloperNote() {
    return (
        <details className="mt-8 border border-[var(--color-border)] rounded-[4px] bg-[var(--color-bg)]">
            <summary className="p-4 cursor-pointer list-none flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)] [&::-webkit-details-marker]:hidden">
                <Code2 size={16} />
                개발자 참고
            </summary>
            <div className="px-4 pb-4 space-y-4 text-sm text-[var(--color-text-secondary)]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-[var(--color-border)]">
                                <th className="py-2 pr-4 font-medium">화면 항목</th>
                                <th className="py-2 pr-4 font-medium">설정 키</th>
                                <th className="py-2 font-medium">구분</th>
                            </tr>
                        </thead>
                        <tbody>
                            {SETTING_KEYS.map((row) => (
                                <tr key={row.key} className="border-b border-[var(--color-border)] last:border-0">
                                    <td className="py-2 pr-4">{row.label}</td>
                                    <td className="py-2 pr-4"><code>{row.key}</code></td>
                                    <td className="py-2">{row.kind}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <p>
                    전체 기술 매뉴얼: <code>docs/외부연동-설정.md</code>
                </p>
            </div>
        </details>
    );
}
