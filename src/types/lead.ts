/** 상담 신청(리드) 타입 — 클라이언트/서버 공용 */
export type LeadSource = 'qna' | 'diagnosis' | 'career';
export type LeadStatus = 'new' | 'contacted' | 'enrolled' | 'dropped';

export interface Lead {
    id: number;
    name: string;
    phone: string;
    region: string;
    desired_job: string;
    source: LeadSource;
    payload: string;       // JSON 문자열
    consent_at: string;
    report: string | null; // 상담사 리포트 JSON 문자열
    status: LeadStatus;
    created_at: string;
}

export const LEAD_SOURCE_LABEL: Record<LeadSource, string> = {
    qna: 'Q&A 봇', diagnosis: '모의진단', career: '자소서·역량',
};
export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
    new: '신규', contacted: '연락함', enrolled: '참여 확정', dropped: '종료',
};
