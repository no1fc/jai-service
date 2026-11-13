import type { PolicyBlock } from '@/lib/privacy/policy';

/**
 * 파싱된 개인정보처리방침 블록을 공개 페이지와 동일한 스타일(디자인 토큰)로 렌더링한다.
 * 공개 페이지(`/privacy`)와 관리자 미리보기(`/admin/settings/privacy`)가 함께 사용한다.
 * 블록 텍스트는 항상 React 텍스트 노드로만 출력하므로(dangerouslySetInnerHTML 미사용)
 * 본문에 HTML 태그가 섞여 있어도 해석되지 않고 그대로 보인다.
 */
export function PolicyView({ blocks }: { blocks: PolicyBlock[] }) {
    return (
        <div className="space-y-6 text-text-secondary leading-relaxed font-medium">
            {blocks.map((block, index) => {
                if (block.type === 'h2') {
                    return (
                        <h2 key={index} className="text-2xl font-bold text-text mb-2 mt-10 first:mt-0">
                            {block.text}
                        </h2>
                    );
                }
                if (block.type === 'h3') {
                    return (
                        <p key={index} className="font-bold text-text mt-4 mb-1">
                            {block.text}
                        </p>
                    );
                }
                if (block.type === 'ul') {
                    return (
                        <ul key={index} className="list-disc pl-5 space-y-2">
                            {block.items.map((item, itemIndex) => (
                                <li key={itemIndex}>{item}</li>
                            ))}
                        </ul>
                    );
                }
                return <p key={index}>{block.text}</p>;
            })}
        </div>
    );
}
