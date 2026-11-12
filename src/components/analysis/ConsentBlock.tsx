'use client';

/** 개인정보 수집·이용 안내 + 필수 동의 체크 2개(LoginForm 하위). */
import Link from 'next/link';

interface ConsentBlockProps {
    consentCollect: boolean;
    consentAge: boolean;
    onChangeCollect: (value: boolean) => void;
    onChangeAge: (value: boolean) => void;
}

const checkboxRow = 'flex items-start gap-2 min-h-11';

export default function ConsentBlock({ consentCollect, consentAge, onChangeCollect, onChangeAge }: ConsentBlockProps) {
    return (
        <div className="rounded-[var(--radius-card)] border border-border bg-bg-elevated p-4 space-y-3">
            <div className="text-sm text-text-secondary space-y-1">
                <p className="font-medium text-text">개인정보 수집·이용 안내</p>
                <p>수집 항목: 카카오 회원번호·이메일(선택) 또는 휴대폰 번호</p>
                <p>목적: 로그인·보관함 제공</p>
                <p>보관 기간: 마지막 로그인 후 1년</p>
                <p><Link href="/privacy" className="text-accent underline">개인정보처리방침 전체 보기</Link></p>
            </div>
            <label className={checkboxRow}>
                <input type="checkbox" checked={consentCollect} onChange={(e) => onChangeCollect(e.target.checked)} className="mt-0.5 w-5 h-5" />
                <span className="text-text">[필수] 개인정보 수집·이용 동의</span>
            </label>
            <label className={checkboxRow}>
                <input type="checkbox" checked={consentAge} onChange={(e) => onChangeAge(e.target.checked)} className="mt-0.5 w-5 h-5" />
                <span className="text-text">[필수] 만 14세 이상입니다</span>
            </label>
        </div>
    );
}
