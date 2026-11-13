/**
 * `/career` 1단계: 희망직무 + STAR 경험(1~2개) + 강점 한 줄.
 */
import { Plus, Trash2 } from 'lucide-react';
import CrossBorderNotice from '@/components/privacy/CrossBorderNotice';
import { isStarComplete, MAX_EXPERIENCES } from './use-career-flow';
import type { Star } from '@/lib/career/schema';

interface StarInputProps {
    desiredJob: string;
    onDesiredJobChange: (v: string) => void;
    experiences: Star[];
    onExperienceChange: (index: number, star: Star) => void;
    onAddExperience: () => void;
    onRemoveExperience: (index: number) => void;
    strengthNote: string;
    onStrengthNoteChange: (v: string) => void;
    canProceed: boolean;
    onNext: () => void;
}

const STAR_FIELDS: { key: keyof Star; label: string; placeholder: string }[] = [
    { key: 'situation', label: '상황(S)', placeholder: '예: 매장에서 재고 관리가 엉켜 주문이 자주 누락되는 상황이었다' },
    { key: 'task', label: '과제(T)', placeholder: '예: 재고 기록 방식을 바꿔 누락률을 낮추는 과제를 맡았다' },
    { key: 'action', label: '행동(A)', placeholder: '예: 매일 마감 시 실물과 전산 수량을 대조해 차이를 기록했다' },
    { key: 'result', label: '결과(R)', placeholder: '예: 한 달 뒤 주문 누락이 눈에 띄게 줄어 동료들도 방식을 따라했다' },
];

const field = 'w-full px-4 rounded-[var(--radius-input)] border border-border bg-bg-elevated text-text focus:outline-none focus:border-accent';
const box = 'rounded-[var(--radius-card)] border border-border bg-bg-elevated p-5';
const primary = 'w-full h-12 rounded-[var(--radius-default)] bg-accent text-white font-bold hover:bg-accent-hover disabled:opacity-50';

export default function StarInput({
    desiredJob, onDesiredJobChange,
    experiences, onExperienceChange, onAddExperience, onRemoveExperience,
    strengthNote, onStrengthNoteChange,
    canProceed, onNext,
}: StarInputProps) {
    return (
        <div className={`${box} space-y-5`}>
            <label className="block">
                <span className="font-medium text-text">희망 직무</span>
                <input value={desiredJob} onChange={e => onDesiredJobChange(e.target.value.slice(0, 100))}
                    placeholder="예: 사무 행정, 웹 개발, 물류 관리" className={`${field} h-12 mt-1`} />
            </label>

            {experiences.map((star, index) => (
                <fieldset key={index} className="space-y-3 border-t border-border pt-4 first:border-t-0 first:pt-0">
                    <legend className="flex w-full items-center justify-between font-medium text-text mb-1">
                        <span>경험 {index + 1}{isStarComplete(star) && <span className="ml-1 text-xs font-normal text-success">입력 완료</span>}</span>
                        {experiences.length > 1 && (
                            <button type="button" onClick={() => onRemoveExperience(index)}
                                className="inline-flex h-11 items-center gap-1 px-2 text-sm text-text-muted" aria-label={`경험 ${index + 1} 삭제`}>
                                <Trash2 size={16} aria-hidden /> 삭제
                            </button>
                        )}
                    </legend>
                    {STAR_FIELDS.map(({ key, label, placeholder }) => (
                        <label key={key} className="block">
                            <span className="text-sm text-text-secondary">{label}</span>
                            <textarea rows={2} value={star[key]} placeholder={placeholder}
                                onChange={e => onExperienceChange(index, { ...star, [key]: e.target.value.slice(0, 200) })}
                                className={`${field} py-2 mt-1 text-sm`} />
                            <span className="text-xs text-text-muted">{star[key].length}/200{star[key].length > 0 && star[key].trim().length < 20 && ' (20자 이상)'}</span>
                        </label>
                    ))}
                </fieldset>
            ))}

            {experiences.length < MAX_EXPERIENCES && (
                <button type="button" onClick={onAddExperience}
                    className="inline-flex h-11 items-center gap-1 px-3 rounded-[var(--radius-default)] border border-border text-sm text-text-secondary">
                    <Plus size={16} aria-hidden /> 경험 추가 (선택)
                </button>
            )}

            <label className="block">
                <span className="font-medium text-text">나의 강점 한 줄 <span className="text-text-muted">(선택)</span></span>
                <input value={strengthNote} onChange={e => onStrengthNoteChange(e.target.value.slice(0, 100))}
                    placeholder="예: 꼼꼼함, 책임감" className={`${field} h-12 mt-1`} />
                <span className="text-xs text-text-muted">{strengthNote.length}/100</span>
            </label>

            <CrossBorderNotice />
            <button type="button" className={primary} disabled={!canProceed} onClick={onNext}>
                다음: 역량 체크
            </button>
        </div>
    );
}
