# J.AI 코드베이스 이슈 트래커

> 마지막 업데이트: 2026-11-12
> 총 31개 이슈 | 해결: 19 | 미해결: 9 (DX-01, JAI-01~08)

---

## P0: J.AI 전환 후속 (미해결)

### JAI-01: 리드 1년 경과 자동 파기 배치 (현재 수동 SQL)

- **상태**: [ ] 미해결
- **설명**: `README.md` 운영 절의 삭제 SQL은 수동 실행 전제. 스케줄러(PM2 cron, Windows 작업 스케줄러 등)로 자동화 필요.

### JAI-02: 2027년 기준값(criteria-2027.ts) 반영

- **상태**: [ ] 미해결
- **설명**: 현재 `src/lib/eligibility/criteria-2026.ts`만 존재. 2027년도 소득·재산 기준 발표 시 별도 파일 추가 및 연도 분기 로직 필요.

### JAI-03: rate-limit 인메모리 → PM2 클러스터 시 공유 저장소 필요

- **상태**: [ ] 미해결
- **파일**: `src/lib/rate-limit.ts`
- **설명**: 인메모리 Map 기반 rate limiter는 PM2 클러스터 모드(다중 프로세스)에서 인스턴스별로 분리되어 제한이 무력화됨. Redis 등 공유 저장소로 교체 필요.

### JAI-04: HTTPS 적용 (배포 작업 필요)

- **상태**: [ ] 미해결 (배포 작업, 코드 변경 아님)
- **파일**: `배포.md` ("J.AI 배포 전 체크리스트" (a)항)
- **설명**: 현재 서버는 포트 3000을 평문 HTTP로 직접 노출한다. `배포.md`에 Nginx 리버스 프록시 + Let's Encrypt(certbot) 구성과 `X-Real-IP`/`X-Forwarded-For` 헤더 설정을 문서화했으나, 실제 운영 서버에 적용하는 작업은 아직 수행되지 않았다. HTTPS 적용 전까지 관리자 로그인 쿠키가 `secure` 속성 없이 발급된다.

### JAI-05: 2027-01-01 Gemini 3.8/3.6 Flash 단가 인상 반영 확인

- **상태**: [ ] 미해결
- **파일**: `src/lib/gemini-models.ts`
- **설명**: `gemini-3.8-flash`/`gemini-3.6-flash`는 2027-01-01부터 입력 $1.50 / 출력 $7.50로 인상 예정(현재 $0.75/$3.75). 카탈로그 `inputRate`/`outputRate`를 인상일에 맞춰 갱신해야 사용량 비용 계산이 정확해진다.

### JAI-06: 사업소득자(월 250만 원 미만 불완전취업자) 규칙 미반영

- **상태**: [ ] 미해결
- **파일**: `src/lib/eligibility/judge.ts`, `src/lib/eligibility/answers.ts`
- **설명**: 현행 규칙 엔진은 임금근로자의 근로시간(주 30시간) 기준만 참여 제한으로 판정한다. 고용24 기준상 사업소득이 있는 1인 자영업자 등 "불완전취업자"(사업소득 월 250만 원 미만 등)에 대한 참여 가능/제한 분기가 질문·판정 로직에 없다. 질문 단계와 `judgeEligibility`에 사업소득자 분기 추가 필요.

### JAI-07: API 라우트/인증 테스트 부재

- **상태**: [ ] 미해결
- **파일**: `src/app/api/**`, `src/lib/auth.ts`
- **설명**: 규칙 엔진(`judge.test.ts` 등) 외에 실제 API 라우트(`/api/chat`, `/api/leads`, `/api/admin/*`)와 `requireRole`/JWT 인증 흐름에 대한 통합 테스트가 없다. 인증 우회, rate limit, 입력 검증 경로가 회귀에 취약하다. DX-01(테스트 전무)의 후속 세부 과제.

### JAI-08: 리드 payload 위조 가능성 (리포트 생성 시 answers로 재계산 필요)

- **상태**: [ ] 미해결
- **파일**: `src/app/api/leads/route.ts`, `src/lib/leads.ts`
- **설명**: `/api/leads`는 클라이언트가 보낸 `payload`(진단 결과 등)를 크기 제한만 검증하고 그대로 저장한다. 클라이언트가 실제 응답과 다른 진단 유형·점수를 조작해 전송해도 서버가 이를 감지하지 못한다. 상담사 리포트 생성 시점에 원본 `answers`로 `judgeEligibility`를 서버에서 재계산해 대조하거나, 최소한 리포트에는 서버 재계산 결과만 사용하도록 수정 필요.

---

## P1: 보안 (즉시 수정 필요)

### SEC-01: SQL Injection 위험

- **상태**: [x] **해결 (2026-05-11)**
- **파일**: `src/lib/db.ts`
- **해결 내용**: `updateBranch()`에 `BRANCH_ALLOWED_COLUMNS` 화이트리스트 적용. 허용 외 컬럼은 자동 필터링되어 SQL에 삽입 불가.

### SEC-02: API 입력 검증 부재

- **상태**: [x] **해결 (2026-05-11)**
- **파일**: `src/lib/validations.ts` (신규 생성)
- **해결 내용**: Zod 스키마 도입. `loginSchema`, `createBranchSchema`, `updateBranchSchema`, `createAdminSchema`, `updateAdminSchema`, `updateSettingSchema`, `chatRequestSchema` 7개 스키마로 모든 API 입력 검증. 문자열 길이, 필수 필드, 형식, 비밀번호 최소 8자, role enum 제한 적용.

### SEC-03: JWT 시크릿 하드코딩 폴백

- **상태**: [x] **해결 (2026-05-11)**
- **파일**: `src/lib/auth.ts`
- **해결 내용**: `'ness-chatbot-admin-secret-key-development'` 폴백 제거. `JWT_SECRET_KEY` 환경변수 필수화 (미설정 시 런타임 에러). 지연 초기화로 빌드 시점 문제 방지.

### SEC-04: 로그인 Rate Limiting 부재

- **상태**: [x] **해결 (2026-05-11)**
- **파일**: `src/lib/rate-limit.ts` (신규), `src/app/api/admin/login/route.ts`
- **해결 내용**: 인메모리 IP 기반 rate limiter 구현 (15분당 10회). 429 응답 + `Retry-After` 헤더. 메모리 정리 로직 포함.

### SEC-05: API 라우트 권한 검사 누락

- **상태**: [x] **해결 (2026-05-11)**
- **파일**: `src/lib/auth.ts`, 8개 admin API 라우트
- **해결 내용**: `requireRole('admin' | 'superadmin')` 헬퍼 함수 신설. `settings` GET/PUT, `branches` GET/POST/PUT/DELETE, `usage` GET, `test-gemini` POST에 적용. 기존 `users` 라우트도 통일.

### SEC-06: 공개 Kakao API 키 엔드포인트

- **상태**: [x] **해결 (2026-05-11)**
- **파일**: `src/app/api/public/kakao-key/route.ts`
- **해결 내용**: Origin/Referer 검증 추가. 외부 도메인 요청 차단 (403). 전체 키 목록 대신 첫 번째 키만 반환. Cache-Control: no-store 헤더 추가.

---

## P2: 아키텍처 (구조적 개선)

### ARCH-01: 서버 모듈 클라이언트 임포트

- **상태**: [x] **해결 (2026-05-11)**
- **파일**: `src/types/db.ts`, `src/types/chat.ts`
- **해결 내용**: 모든 클라이언트 컴포넌트가 `@/types/db`에서만 타입 임포트. `@/lib/db` 직접 임포트 없음 확인. 채팅 타입도 `@/types/chat.ts`로 분리.

### ARCH-02: Error Boundary 부재

- **상태**: [x] **해결 (2026-05-11)**
- **파일**: `src/components/ErrorBoundary.tsx` (신규), `src/app/chat/page.tsx`, `src/app/admin/layout.tsx`
- **해결 내용**: `ErrorBoundary` 클래스 컴포넌트 생성. Chat 페이지와 Admin 레이아웃에 적용. 다시 시도 버튼 포함.

### ARCH-03: API 응답 포맷 불일치

- **상태**: [x] **해결 (2026-05-11)**
- **파일**: `src/lib/api-response.ts` (신규), 모든 admin API 라우트
- **해결 내용**: `apiSuccess`/`apiError` 헬퍼 도입. 모든 admin API 응답 통일.

### ARCH-04: 지점 조회 로직 중복

- **상태**: [x] **해결 (2026-05-11)**
- **파일**: `src/app/api/branches/route.ts`
- **해결 내용**: 공개/관리자 라우트 모두 `apiSuccess`/`apiError` 헬퍼로 응답 통일. 공통 DB 함수(`getAllBranches`, `getBranchByRegion`)는 이미 `db.ts`에 있어 서비스 레이어 역할. 관리자 라우트는 인증 추가로 의도적 분리 유지.

### ARCH-05: 관할지역 검색 풀테이블 스캔

- **상태**: [x] **해결 (2026-05-11)**
- **파일**: `src/lib/db.ts` (`getBranchByRegion`)
- **해결 내용**: JS 순회를 MSSQL `OPENJSON()` + `CROSS APPLY`로 대체. SQL 레벨 필터링.

---

## P3: 코드 품질

### CODE-01: useChat 과도한 useState (12개+)

- **상태**: [x] **해결 (2026-05-11)**
- **파일**: `src/hooks/useChat.ts`
- **해결 내용**: 12개 useState를 단일 `useReducer`로 통합. `chatReducer` 순수 함수로 모든 상태 전환 관리. `totalSteps`는 `TOTAL_STEPS` 상수로 추출.

### CODE-02: ESLint exhaustive-deps 비활성화

- **상태**: [x] **해결 (2026-05-11)**
- **파일**: `src/hooks/useChat.ts`
- **해결 내용**: 2개의 `eslint-disable-next-line` 완전 제거. `SAVE_SNAPSHOT` 액션이 리듀서에서 state를 직접 읽어 stale closure 문제 해소. `dispatch`는 안정적 참조.

### CODE-03: useCallback 함수 호이스팅 이슈

- **상태**: [x] **해결 (2026-05-11)**
- **파일**: `src/hooks/useChat.ts`
- **해결 내용**: `chatReducer`를 훅 외부에 정의. 콜백 순서를 `callChatAPI` → `triggerAnalysis` → `sendChoice` → `sendText`로 재배치하여 의존성 순서 보장.

### CODE-04: any 타입 남용

- **상태**: [x] **해결 (2026-05-11)**
- **파일**: `src/lib/prompts.ts`, `src/types/chat.ts` (신규)
- **해결 내용**: `QuestionChoice`, `StaticQuestion`, `ChatStepMessage`, `LocationStepMessage` 인터페이스 정의. 채팅 타입은 `src/types/chat.ts`로 분리.

### CODE-05: 모놀리식 관리자 페이지

- **상태**: [x] **해결 (2026-05-11)**
- **파일**: `src/app/admin/branches/page.tsx` (646줄 → 526줄), `src/components/admin/MapPreview.tsx` (신규)
- **해결 내용**: `MapPreview` 컴포넌트(120줄)를 `src/components/admin/MapPreview.tsx`로 분리. CSS 변수 적용.

### CODE-06: console.* 프로덕션 코드 산재

- **상태**: [x] **해결 (2026-05-11)**
- **파일**: `src/lib/logger.ts` (신규), 20개 파일
- **해결 내용**: `logger` 유틸리티 도입 (error/warn은 항상, info는 dev만). 48개 console 문 중 39개를 logger로 교체. 잔여 9개는 logger 자체(3), seed.ts CLI(5), ErrorBoundary dev 전용(1).

---

## P4: 디자인

### DESIGN-01: 하드코딩된 색상값

- **상태**: [x] **해결 (2026-05-11)**
- **파일**: 9개 admin 파일, `src/components/admin/MapPreview.tsx`
- **해결 내용**: admin 페이지 전체에서 500+개 하드코딩 hex 색상을 `var(--color-*)` CSS 변수로 교체. `globals.css @theme`에 정의된 디자인 토큰 활용.

### DESIGN-02: 애니메이션 방식 혼재

- **상태**: [x] **해결 (2026-05-11)**
- **파일**: `src/app/globals.css`, `src/components/chat/LoadingIndicator.tsx`
- **해결 내용**: 미정의 `animate-flow-gradient`에 대한 `@keyframes flow-gradient` 추가. `pulse-soft` 키프레임 추가. CSS 애니메이션 방식으로 통일 (Framer Motion 미사용 확인).

### DESIGN-03: 관리자/사용자 테마 완전 분리

- **상태**: [x] **해결 (2026-05-11)**
- **파일**: `src/app/globals.css`, admin 페이지 전체
- **해결 내용**: 관리자/사용자 페이지 모두 `globals.css @theme`의 공통 CSS 변수(`--color-bg`, `--color-accent` 등)를 공유하도록 통일. 하드코딩 hex 색상을 CSS 변수로 교체하여 공통 토큰 체계 적용 완료.

---

## P5: 개발자 경험

### DX-01: 테스트 부재

- **상태**: [ ] 미해결
- **파일**: -
- **설명**: 유닛/통합/E2E 테스트 전무. 변경 시 회귀 버그 감지 불가.
- **권장 수정**: Vitest + React Testing Library(유닛), Playwright(E2E) 도입

### DX-02: 로깅 라이브러리 부재

- **상태**: [x] **부분 해결 (2026-05-11)**
- **파일**: `src/lib/logger.ts`
- **해결 내용**: 경량 logger 유틸리티 도입 (error/warn/info 레벨). 프로덕션에서는 pino 등으로 교체 권장.

---

## 변경 이력

| 날짜 | 변경 내용 |
|------|---------|
| 2026-04-29 | 최초 작성 - 21개 이슈 식별 및 문서화 |
| 2026-05-11 | 19/23개 해결. SEC-01~06(보안), ARCH-01~05(아키텍처), CODE-01~06(코드품질), DESIGN-01~03(디자인), DX-02(로깅). useReducer 리팩토링, logger, apiSuccess/apiError, ErrorBoundary, OPENJSON, Zod, Rate Limiting, CSS 변수 통일, MapPreview 분리, 애니메이션 정리 |
| 2026-11-12 | 개인정보처리방침을 관리자(최고 관리자 전용) 화면에서 실시간 미리보기와 함께 편집하도록 추가 (`/admin/settings/privacy`, `src/lib/privacy/policy.ts`) |
