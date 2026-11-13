import type { BranchState, ChatPhase, DiagnosisResult } from '@/types/chat';

/** 결과 화면에서 지점 조회를 시작할지 — 판정 유형('제한' 포함)과 무관하게 결과가 있으면 조회한다. */
export const shouldLookupBranch = (phase: ChatPhase, branch: BranchState, result: DiagnosisResult | null): boolean =>
    phase === 'result' && branch === 'none' && result !== null;
