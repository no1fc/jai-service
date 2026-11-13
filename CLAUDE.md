# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev          # Start dev server (Turbopack enabled)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint
```

```bash
npm test             # Vitest (src/**/*.test.ts)
```

## Architecture Overview

J.AI (잡모아 AI 취업 도우미) helps surface potential 국민취업지원제도(국취) participants and convert them into 상담 신청 via AI tools: a Q&A bot (`/ask`), a rule-based eligibility self-diagnosis (`/chat`), and an AI self-introduction/competency check (`/career`). Leads flow into MSSQL `leads` for admin/counselor follow-up.
- `/analysis` — AI 직무·산업 분석. 고용24 공개데이터 + Gemini로 리포트를 생성하고(경쟁사 데이터 옵션 ON 시 Google Search 포함 연구 호출 + 리포트 호출 2단계, OFF 시 1단계), 카카오/휴대폰 인증 로그인 회원은 서버 보관함에, 비로그인은 localStorage에 리포트를 저장한다.

**Stack**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, MSSQL (mssql/tedious), Google Gemini API (`@google/genai`), Vitest

### Request Flow

1. User opens `/chat` → `ChatContainer` renders, calls `useChat()` hook
2. `useChat` manages all chat state and calls `POST /api/chat` for each step
3. `/api/chat` returns static questions sequentially (`phase: 'questioning'`), then on the final step triggers `phase: 'analyzing'`
4. The `analyzing` phase is judged entirely by the `src/lib/eligibility/judge.ts` rule engine (12 questions, no AI); Gemini is only called afterward to generate a natural-language explanation of that verdict (`src/lib/eligibility/explain.ts`)
5. `generateResponse()` in `gemini.ts` calls Gemini API with retry logic and multi-key fallback
6. The AI returns a JSON diagnosis result (type, score, description, tips)
7. `ResultCard` and `BranchCard` display the result with a nearby branch lookup via Kakao Maps

### Key Modules

- **`src/hooks/useChat.ts`** — Central chat state machine. Manages phases (`intro → questioning → analyzing → result`), message history, user answers, and state snapshots for go-back functionality.
- **`src/lib/prompts.ts`** — All AI prompts and question definitions. Static questions are stored as arrays. The system prompt uses `{{placeholder}}` template variables replaced at runtime. Prompts are DB-overridable via `system_settings` table.
- **`src/lib/db.ts`** — MSSQL connection pool (singleton) with tables: `branches`, `admin_users`, `system_settings`, `api_usage_logs`. Handles schema migration (column additions) on startup.
- **`src/lib/gemini.ts`** — Gemini API client with rate-limit retry (429 → 30s wait) and multiple API key fallback.
- **`src/middleware.ts`** — Protects `/admin/*` routes with JWT cookie validation. Role-based: `admin` sees subset of pages, `superadmin` sees all.
- **`src/lib/eligibility/`** — 수급자격 모의진단 규칙 엔진(`judge.ts`, 12문항)과 AI 설명 생성(`explain.ts`).
- **`src/lib/leads.ts`** — 상담 신청(`leads`) 테이블 CRUD (삽입·조회·상태 변경·리포트 저장).
- **`src/lib/qna/`** — 국취 24시 Q&A 봇(`/ask`)용 지식 문서(`knowledge.ts`)와 프롬프트(`prompt.ts`).
- **`src/lib/career/`** — AI 1분 자기소개서·역량 진단(`/career`)의 입출력 스키마와 프롬프트.
- **`src/lib/report/`** — 상담사 AI 리포트 프롬프트·스키마. 이름·연락처는 AI에 전송하지 않음(`maskPhone` 등 참고).
- **`src/lib/analysis/`** — AI 직무·산업 분석(`/analysis`) 생성 파이프라인(`generate.ts`), 고용24 연동(`work24.ts`), 카카오/휴대폰 인증 로그인(`auth/`), 서버 PDF 렌더링(`pdf/`).

### Admin Dashboard

Admin pages at `/admin/*` provide CRUD for branches, users, API keys, AI prompts, and usage analytics. Two roles exist: `admin` (limited) and `superadmin` (full access). Auth uses JWT stored in `admin_session` cookie.

### Design System

`DESIGN.md` in the project root defines the visual system (밝은 공공·커리어 서비스 톤, 모바일 우선). All UI work should reference this file. Key rules:
- Light theme only: page bg `#f7f8fa`, card/input bg `#ffffff`, accent `#2563eb`
- Radius: 8px buttons/chips, 10px inputs, 12px cards; shadow only on card hover (`shadow-sm`)
- No glassmorphism/blur, no hardcoded colors — use tokens only
- Font: Pretendard, 16px+ body on mobile, 44px min touch target, WCAG AA contrast
- Design tokens are defined in `globals.css` under `@theme`

## Environment Variables

Required in `.env.local`:
- `GEMINI_API_KEY` — Google Gemini API key (additional keys managed via admin settings DB)
- `NEXT_PUBLIC_KAKAO_MAP_API_KEY` — Kakao Maps JavaScript API key
- `NESS_ADMIN_ID` / `NESS_ADMIN_PASSWORD` — Initial admin credentials (used by seed script)
- `JWT_SECRET_KEY` — JWT signing secret (MUST be set in production, no fallback allowed)
- `MSSQL_HOST`, `MSSQL_PORT`, `MSSQL_USER`, `MSSQL_PASSWORD`, `MSSQL_DATABASE` — MSSQL connection
- `MSSQL_ENCRYPT`, `MSSQL_TRUST_SERVER_CERTIFICATE` — MSSQL TLS options
- `SMS_PROVIDER` — `log`(기본, 콘솔에 인증번호 로그) 또는 `sens`(네이버 클라우드 SENS로 실제 발송). 운영에서는 `sens`만 허용(`log`면 503).

## Harness Configuration

### Permissions (`.claude/settings.local.json`)
- `npm run *`, `npx *`, `git *`, `gh *` — 빌드/린트/깃 자동 허용
- Playwright, Context7, Exa, GitHub MCP — 자동 허용

### PostToolUse Hooks
- **TypeScript check**: `.ts`/`.tsx` 파일 편집 후 `tsc --noEmit` 자동 실행 (오류 시 상위 20줄 표시)

### Workflow
- 기능 추가 시: brainstorming → planning → TDD → code-review 순서
- 커밋 전: `npm run lint` + `npm run build` 통과 확인
- 보안 민감 코드 변경 시: security-reviewer 에이전트 사용

## Important Patterns

- **Path alias**: `@/*` maps to `src/*`
- **Server-only modules**: `db.ts`, `auth.ts`, `gemini.ts`, `prompts.ts` use `mssql` and must not be imported from client components. Shared types should be extracted to `src/types/`.
- **Native packages**: `pdfjs-dist`, `mssql`, `canvas` are configured as `serverExternalPackages` in `next.config.ts` to prevent bundling issues.
- **API responses**: Not yet standardized — some routes return `{ success, data }`, others return raw objects. See `docs/ISSUES.md` for tracked inconsistencies.
- **Known issues**: `docs/ISSUES.md` tracks 21 codebase issues by priority (security, architecture, code quality, design, DX).
- 분석 테이블은 `initSchema`가 만들지 않음 — `scripts/create-analysis-schema.sql`
- 고용24·SENS·카카오 자격증명은 환경변수가 아니라 `system_settings`(`getSetting`)로 관리 — `/admin/settings` > API 설정 > 외부 연동에서 입력
