'use client';

/** 상담사용 직무·산업 분석 대시보드 — 오늘/7일 생성 수, 캐시 적중률, 최근 분석, 많이 찾는 직무·산업 TOP 10. */
import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Briefcase, FileText, Percent, TrendingUp } from 'lucide-react';
import { logger } from '@/lib/logger';
import { ANALYSIS_TYPE_LABEL, type AnalysisRequest } from '@/lib/analysis/schema';
import type { Actor, DashboardStats, DashboardTopRow } from '@/lib/analysis/reports';

const ACTOR_LABEL: Record<Actor['kind'], string> = { anon: '비로그인', user: '회원', admin: '관리자' };
const card = 'bg-[var(--color-bg-elevated)] rounded-[4px] border border-[var(--color-border)] p-6';

function StatCard({ title, value, icon }: { title: string; value: string; icon: ReactNode }) {
    return (
        <div className="bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 rounded-[4px] p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-[var(--color-accent)] font-medium whitespace-nowrap">{title}</h3>
                <div className="w-10 h-10 rounded-[4px] bg-[var(--color-accent)]/20 flex items-center justify-center shrink-0">{icon}</div>
            </div>
            <p className="text-3xl font-bold text-[var(--color-accent)]">{value}</p>
        </div>
    );
}

/** 막대 길이는 div 너비(%)로만 표현한다 — 차트 라이브러리를 쓰지 않는다. */
function TopList({ title, type, rows }: { title: string; type: AnalysisRequest['type']; rows: DashboardTopRow[] }) {
    const max = Math.max(1, ...rows.map(r => r.cnt));
    return (
        <div className={card}>
            <h2 className="font-bold text-[var(--color-text)] mb-4">{title}</h2>
            {rows.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)]">최근 30일간 데이터가 없습니다.</p>
            ) : (
                <ul className="space-y-2">
                    {rows.map((r, i) => (
                        <li key={r.keyword}>
                            <Link
                                href={`/admin/analysis/new?type=${type}&keyword=${encodeURIComponent(r.keyword)}`}
                                className="flex items-center gap-3 group"
                            >
                                <span className="w-5 text-xs text-[var(--color-text-muted)] shrink-0">{i + 1}</span>
                                <span className="w-28 truncate text-sm text-[var(--color-text)] group-hover:text-[var(--color-accent)]">{r.keyword}</span>
                                <span className="flex-1 h-5 bg-[var(--color-bg)] rounded-[4px] overflow-hidden">
                                    <span className="block h-full bg-[var(--color-accent)] rounded-[4px]" style={{ width: `${(r.cnt / max) * 100}%` }} />
                                </span>
                                <span className="w-10 text-right text-xs text-[var(--color-text-muted)] shrink-0">{r.cnt}건</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function RecentTable({ rows }: { rows: DashboardStats['recent'] }) {
    return (
        <div className={`${card} overflow-x-auto`}>
            <h2 className="font-bold text-[var(--color-text)] mb-4">최근 분석 (최대 20건)</h2>
            {rows.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)]">아직 요청이 없습니다.</p>
            ) : (
                <table className="w-full text-sm">
                    <thead className="text-[var(--color-text-secondary)]">
                        <tr>{['시각', '유형', '키워드', '요청자'].map(h => <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>)}</tr>
                    </thead>
                    <tbody>
                        {rows.map((r, i) => (
                            <tr key={`${r.publicId}-${i}`} className="border-t border-[var(--color-border)]">
                                <td className="px-3 py-2 whitespace-nowrap">{new Date(r.requestedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</td>
                                <td className="px-3 py-2">{ANALYSIS_TYPE_LABEL[r.type]}</td>
                                <td className="px-3 py-2 truncate max-w-[12rem]">{r.keyword}</td>
                                <td className="px-3 py-2">{ACTOR_LABEL[r.actor]}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}

export default function AdminAnalysisDashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [totalReports, setTotalReports] = useState(0);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch('/api/admin/analysis/dashboard')
            .then(r => r.json())
            .then(d => {
                if (!d.success) return setError(d.error);
                setStats(d.stats);
                setTotalReports(d.totalReports);
            })
            .catch(err => {
                logger.error('대시보드 조회 실패:', err);
                setError('대시보드를 불러오지 못했습니다.');
            });
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center gap-4 flex-wrap">
                <h1 className="text-3xl font-bold text-[var(--color-text)]">직무·산업 분석</h1>
                <Link href="/admin/analysis/new" className="h-11 inline-flex items-center px-4 rounded-[4px] bg-[var(--color-accent)] text-white font-semibold">
                    신규 분석
                </Link>
            </div>

            {error && <p role="alert" className="text-[var(--color-danger)]">{error}</p>}
            {!stats && !error && <p className="text-[var(--color-text-muted)]">불러오는 중...</p>}

            {stats && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard title="오늘 생성" value={`${stats.today}건`} icon={<FileText size={20} className="text-[var(--color-accent)]" />} />
                        <StatCard title="7일 생성" value={`${stats.last7d}건`} icon={<TrendingUp size={20} className="text-[var(--color-accent)]" />} />
                        <StatCard title="캐시 적중률(30일)" value={`${Math.round(stats.cacheHitRate * 100)}%`} icon={<Percent size={20} className="text-[var(--color-accent)]" />} />
                        <StatCard title="전체 리포트 수" value={`${totalReports}건`} icon={<Briefcase size={20} className="text-[var(--color-accent)]" />} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <TopList title="많이 찾는 직무 TOP 10 (30일)" type="job" rows={stats.topJobs} />
                        <TopList title="많이 찾는 산업 TOP 10 (30일)" type="industry" rows={stats.topIndustries} />
                    </div>

                    <RecentTable rows={stats.recent} />
                </>
            )}
        </div>
    );
}
