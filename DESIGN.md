# J.AI Design System

## 톤
밝고 신뢰감 있는 공공·커리어 서비스. 20~30대 구직자, 모바일 우선. 과한 장식 없이 정보가 먼저 보이게 한다.

## 토큰 (`src/app/globals.css` `@theme`)
| 용도 | 토큰 | 값 |
|------|------|----|
| 페이지 배경 | `bg-bg` | #f7f8fa |
| 카드/입력 배경 | `bg-bg-elevated` | #ffffff |
| 본문 | `text-text` | #191f28 |
| 보조 | `text-text-secondary` | #4e5968 |
| 흐린 글자 | `text-text-muted` | #8b95a1 |
| 강조 | `bg-accent` / `text-accent` | #2563eb |
| 강조 배경 | `bg-accent-soft` | #eef4ff |
| 경계 | `border-border` | #e5e8eb |
| 성공/경고/위험 | `text-success` / `text-warning` / `text-danger` | #16a34a / #f59e0b / #e5484d |

## 규칙
- 라운드: 버튼·칩 8px(`--radius-default`), 입력 10px(`--radius-input`), 카드 12px(`--radius-card`)
- 그림자는 카드 hover에만 `shadow-sm`. 글래스모피즘·블러 금지
- 글꼴: Pretendard. 본문 16px 이상(모바일), 줄간격 1.6
- 터치 영역 최소 44px, 좌우 여백 16px, 가로 스크롤 금지
- 대비 WCAG AA 이상. `bg-accent` 위 글자는 흰색
- 하드코딩 색상 금지 — 토큰만 사용
