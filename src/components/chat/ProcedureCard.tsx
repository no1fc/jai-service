'use client';

import { ClipboardList, UserCheck, Calculator, PieChart } from 'lucide-react';

export default function ProcedureCard() {
    const procedures = [
        { id: 1, text: '기본 정보 입력', icon: ClipboardList },
        { id: 2, text: '취업 상태 확인', icon: UserCheck },
        { id: 3, text: '소득 및 자산 검증', icon: Calculator },
        { id: 4, text: '최종 결과 진단', icon: PieChart }
    ];

    return (
        <div className="rounded-[4px] bg-bg-elevated border border-border p-8 my-6 animate-reveal-up max-w-sm">
            <div className="flex items-center gap-3 mb-8">
                <div className="w-1.5 h-6 bg-accent rounded-[4px]" />
                <h3 className="text-text-secondary font-black text-xs uppercase tracking-[0.2em]">
                    Diagnosis Workflow
                </h3>
            </div>

            <div className="space-y-6">
                {procedures.map((p, idx) => (
                    <div key={p.id} className="flex items-center gap-5 group">
                        <div className="w-12 h-12 rounded-[4px] bg-bg flex items-center justify-center border border-border group-hover:border-border-strong transition-colors">
                            <p.icon size={20} className="text-text-muted group-hover:text-accent transition-colors" />
                        </div>
                        <div className="flex-1">
                            <p className="text-text-muted text-[10px] font-bold uppercase tracking-widest mb-0.5">Step 0{p.id}</p>
                            <p className="text-text-secondary text-sm font-bold group-hover:text-text transition-colors">{p.text}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
