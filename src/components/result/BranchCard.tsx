'use client';

import { MapPin, Phone, ExternalLink, Building2 } from 'lucide-react';
import { Branch } from '@/types/db';
import MapWidget from '@/components/result/MapWidget';
import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

interface BranchCardProps {
    branch: Branch | null;
    diagnosisType: string;
}

export default function BranchCard({ branch, diagnosisType }: BranchCardProps) {
    const utmParams = new URLSearchParams({
        type: diagnosisType,
        source: 'chatbot',
    }).toString();

    const [allBranches, setAllBranches] = useState<Branch[]>([]);

    useEffect(() => {
        if (!branch) {
            fetch('/api/branches')
                .then(res => res.json())
                .then(data => {
                    if (data.branches) setAllBranches(data.branches);
                })
                .catch(err => logger.error(err));
        }
    }, [branch]);

    if (!branch) {
        return (
            <div className="w-full h-full min-h-[400px] flex flex-col animate-reveal-up">
                <div className="bg-bg-elevated rounded-[var(--radius-card)] p-5 md:p-6 border border-border relative overflow-hidden h-full flex flex-col justify-center">
                    <div className="flex flex-col items-center text-center mb-4 relative z-10 shrink-0">
                        <div className="w-14 h-14 rounded-[var(--radius-card)] bg-bg flex items-center justify-center mb-4 border border-border">
                            <Building2 size={28} className="text-text-muted" />
                        </div>
                        <p className="text-text-muted text-[10px] font-black uppercase tracking-[0.3em] mb-2">Branch Information</p>
                        <h2 className="text-text text-2xl md:text-3xl font-black tracking-tighter">거주지와 가까운 잡모아 지점이 없습니다</h2>
                    </div>

                    <div className="bg-bg rounded-[var(--radius-card)] p-5 mb-5 border border-border relative z-10 min-h-0 flex flex-col flex-1">
                        <p className="text-text-secondary text-sm leading-relaxed text-center font-medium mb-4 shrink-0">
                            선택하신 지역에는 현재 잡모아 지점이 운영되고 있지 않습니다.<br />
                            아래의 전체 지점 목록을 확인하시거나 고용24를 통해 온라인 신청이 가능합니다.
                        </p>

                        {allBranches.length > 0 && (
                            <div className="overflow-y-auto pr-2 space-y-3 custom-scrollbar flex-1 min-h-[150px] max-h-[350px]">
                                {allBranches.map((b) => (
                                    <div key={b.id} className="text-left bg-bg p-4 rounded-[var(--radius-card)] border border-border hover:bg-bg-elevated transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <p className="text-text font-bold text-sm md:text-base">{b.branch_name}</p>
                                            <a href={`tel:${b.phone}`} className="text-accent text-xs font-bold hover:underline flex items-center gap-1">
                                                <Phone size={10} /> {b.phone}
                                            </a>
                                        </div>
                                        <p className="text-text-secondary text-xs flex items-start gap-1 leading-snug">
                                            <MapPin size={12} className="shrink-0 mt-0.5 text-danger" /> {b.address}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="mt-auto pt-2 shrink-0">
                        <a
                            href={`https://www.work24.go.kr/ua/z/z/1100/selectOperInst.do?currentPageNo=1&recordCountPerPage=10&srchType=&srchRegionCd=&srchBizSecd=K&srchRegionDetailCd=&srchKeyword=%EC%9E%A1%EB%AA%A8%EC%95%84`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full h-12 md:h-14 rounded-[var(--radius-default)] bg-accent text-white font-black text-xs md:text-sm flex items-center justify-center gap-3 transition-all"
                        >
                            <ExternalLink size={20} />
                            고용24에서 바로 신청하기
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    const branchUrl = branch.specific_url.includes('?')
        ? `${branch.specific_url}&${utmParams}`
        : `${branch.specific_url}?${utmParams}`;

    return (
        <div className="w-full h-full min-h-[400px] flex flex-col animate-reveal-up">
            <div className="bg-bg-elevated rounded-[var(--radius-card)] p-5 md:p-6 border border-accent/20 relative overflow-hidden h-full flex flex-col justify-center">
                <div className="flex flex-col items-center text-center mb-4 relative z-10 shrink-0">
                    <div className="w-14 h-14 rounded-[var(--radius-card)] bg-accent/10 flex items-center justify-center mb-4 border border-accent/20">
                        <Building2 size={28} className="text-accent" />
                    </div>
                    <p className="text-accent text-[10px] font-black uppercase tracking-[0.3em] mb-2">Nearby Branch</p>
                    <h2 className="text-text text-2xl md:text-3xl font-black tracking-tighter mb-1">{branch.branch_name}</h2>
                </div>

                <div className="flex-1 flex flex-col justify-center space-y-3 mb-4 relative z-10 w-full">
                    {/* 주소 */}
                    <div className="bg-bg rounded-[var(--radius-card)] p-4 border border-border flex gap-4 hover:bg-bg-elevated transition-colors">
                        <div className="flex-1">
                            <p className="text-text-muted text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-1.5"><MapPin size={12} className="text-danger" /> Address</p>
                            <p className="text-text text-sm font-bold leading-relaxed">{branch.address}</p>
                        </div>
                    </div>

                    {/* 지도 컴포넌트 삽입 영역 (높이 조절) */}
                    <div className="w-full h-[160px] md:h-[200px] rounded-[var(--radius-card)] overflow-hidden border border-border">
                        <MapWidget branch={branch} />
                    </div>

                    {/* 연락처 */}
                    <div className="bg-bg rounded-[var(--radius-card)] p-4 border border-border flex gap-4 hover:bg-bg-elevated transition-colors group">
                        <div className="flex-1 flex justify-between items-center">
                            <div>
                                <p className="text-text-muted text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-1.5"><Phone size={12} className="text-success" /> Phone</p>
                                <a href={`tel:${branch.phone}`} className="text-success text-xl font-black tracking-tighter hover:underline decoration-2 underline-offset-4">
                                    {branch.phone}
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-2 mt-auto pt-2 relative z-10 shrink-0">
                    <a
                        href={branchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full h-12 md:h-14 rounded-[var(--radius-default)] bg-accent text-white font-black text-xs md:text-sm flex items-center justify-center gap-3 transition-all"
                    >
                        <ExternalLink size={20} />
                        지금 바로 신청하기
                    </a>

                    <a
                        href={`tel:${branch.phone}`}
                        className="w-full h-12 md:h-14 rounded-[var(--radius-default)] bg-bg border border-border text-text font-black text-xs md:text-sm flex items-center justify-center gap-3 transition-all hover:bg-bg-elevated"
                    >
                        <Phone size={20} />
                        전화 상담
                    </a>
                </div>

                <p className="text-center text-[10px] text-text-muted mt-2 leading-relaxed font-sans font-medium shrink-0">
                    지점별 상황에 따라 대기 시간이 발생할 수 있습니다.<br />
                    전문 상담원의 안내는 무료로 제공됩니다.
                </p>
            </div>
        </div>
    );
}
