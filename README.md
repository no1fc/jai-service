# J.AI (잡모아 AI 취업 도우미)

J.AI는 국민취업지원제도(국취) 잠재 참여자를 AI로 발굴하고 실제 상담 신청으로 전환하는 서비스입니다.

## 주요 기능

### 1. 국취 24시 Q&A 봇 (`/ask`)

- 국취 제도 FAQ·지식 문서를 프롬프트에 주입한 **Google Gemini** 기반 Q&A.

### 2. 수급자격 모의진단 (`/chat`)

- 12문항 규칙 엔진(`src/lib/eligibility/judge.ts`)이 유형(1유형/2유형/제한)을 판정하고, Gemini가 판정 결과에 대한 설명만 생성.

### 3. AI 1분 자기소개서·역량 진단 (`/career`)

- 간단 입력으로 자기소개서 초안과 희망 직무 기준 역량 진단 결과를 생성.

### 4. 상담 신청 → 상담사 AI 리포트

- 각 결과 화면에서 개인정보 동의 후 상담 신청 → MSSQL `leads` 테이블 저장.
- 관리자 `/admin/leads`에서 리드 목록 확인, Gemini로 상담사용 분석 리포트 생성.

### 5. 관리자 대시보드

- **지점 관리**: 전국 지점 정보 추가, 수정, 삭제 및 활성화 상태 관리.
- **사용자 관리**: 서비스 운영진 계정 관리 (bcrypt 보안 적용).
- **설정 관리**: Gemini API 키·모델(용도별) 및 AI 프롬프트(페르소나) 실시간 업데이트.
- **사용량 모니터링**: API 토큰 사용량 확인 및 분석.
- **개인정보처리방침 관리**: 공개 `/privacy` 페이지 본문을 관리자 화면(최고 관리자 전용)에서 실시간 미리보기와 함께 편집.

### 6. AI 직무·산업 분석 (`/analysis`)

- 직무 또는 산업을 입력하면 고용24 공개데이터 + Google Gemini로 분석 리포트를 생성(경쟁사 데이터 옵션 ON 시 Google Search 포함 연구 호출 + 리포트 호출 2단계, OFF 시 1단계).
- 카카오 로그인 또는 휴대폰 인증 로그인 회원은 서버 보관함에, 비로그인 이용자는 브라우저 localStorage에 리포트를 보관하며 PDF로 내려받을 수 있다.
- 관리자 `/admin/analysis`에서 생성 현황 대시보드와 보관함 검색을 제공.

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| **Framework** | Next.js 16 (App Router) |
| **Frontend** | React 19, Tailwind CSS 4, Framer Motion |
| **AI Engine** | Google Gemini (`@google/genai`) |
| **Database** | MSSQL (mssql/tedious) |
| **Auth** | JWT (jose), bcryptjs |
| **Test** | Vitest |
| **Deployment** | Ubuntu 24.04, Nginx, PM2, Standalone Build |

---

## 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 아래 변수들을 설정해야 합니다.

```env
# Gemini API
GEMINI_API_KEY=your_api_key_here

# MSSQL 데이터베이스
MSSQL_HOST=localhost
MSSQL_PORT=1433
MSSQL_USER=your_user
MSSQL_PASSWORD=your_password
MSSQL_DATABASE=your_database
MSSQL_ENCRYPT=false
MSSQL_TRUST_SERVER_CERTIFICATE=true

# JWT 보안 설정 (관리자 로그인용)
JWT_SECRET_KEY=your_random_secret_string

# Kakao Maps API
NEXT_PUBLIC_KAKAO_MAP_API_KEY=your_kakao_key

# 초기 관리자 계정 (시드 스크립트용)
NESS_ADMIN_ID=admin
NESS_ADMIN_PASSWORD=your_admin_password

# AI 직무·산업 분석 - 문자 인증 발송 방식 (log: 콘솔 로그, sens: 네이버 클라우드 SENS 실제 발송)
SMS_PROVIDER=log
```

고용24·카카오·SENS 자격증명은 `.env.local`이 아니라 관리자 화면 `/admin/settings/api-keys` > "외부 연동"에서 입력한다(저장은 `superadmin` 역할만 가능).

---

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 개발 서버 실행

```bash
npm run dev
```

### 3. 테스트

```bash
npm test
```

### 4. 프로덕션 빌드

```bash
npm run build
npm run start
```

---

## 분석 서비스 DB 준비

AI 직무·산업 분석(`/analysis`) 테이블은 `initSchema`가 자동 생성하지 않으므로, 아래 스크립트를 수동으로 실행해야 한다.

```bash
# 1) 분석 서비스 테이블 생성 (최초 1회)
sqlcmd -S <서버> -d <DB> -i scripts/create-analysis-schema.sql

# 2) 만료된 인증번호·오래된 캐시 등 정리 (운영은 cron 03:10 권장, 배포.md (l)항 참고)
sqlcmd -S <서버> -d <DB> -i scripts/purge-analysis-data.sql
```

---

## 배포 가이드

본 프로젝트는 Ubuntu 서버 환경에서의 **Standalone 빌드**를 권장합니다.
상세한 배포 절차는 **[배포.md](./배포.md)** 파일을 참조하세요.

### 배포 요약

1. `npm run build` 실행
2. `.next/standalone` 결과물을 서버의 `/opt/next-app`으로 업로드
3. `pm2 start server.js` 명령어로 서비스 구동
4. Nginx를 통해 80포트 요청을 3000포트로 전달

---

## 운영

### 리드 1년 경과 파기

`leads`는 신청일로부터 1년 보관 후 파기한다 (`created_at`은 UTC 저장).

애플리케이션이 `insertLead`/`getLeads` 호출 시 24시간에 한 번 자동으로 파기한다(`src/lib/leads.ts`의 `maybePurgeExpiredLeads`, 실패해도 요청 흐름을 막지 않고 다음 기회에 재시도). 트래픽이 없는 날을 대비해 `scripts/purge-expired-leads.sql`(리드 1년 + 관리자 접속기록 2년 삭제)을 서버 cron 또는 SQL Server Agent 작업으로 매일 03:00에 등록한다.

```bash
# 서버 cron 예시 (매일 03:00)
0 3 * * * sqlcmd -S <서버> -d <DB> -i /opt/NESSChatBot/next-app/scripts/purge-expired-leads.sql
```

직접 실행이 필요하면 아래 SQL을 수동으로 실행해도 된다(UTC 기준).

```sql
DELETE FROM leads WHERE created_at < DATEADD(year, -1, SYSUTCDATETIME());
DELETE FROM admin_access_logs WHERE created_at < DATEADD(year, -2, SYSUTCDATETIME());
```

---

## 프로젝트 구조

```
src/
├── app/              # 페이지 라우팅 및 레이아웃 (App Router)
│   ├── api/          # 백엔드 API 엔드포인트 (Gemini 통신, DB 처리 등)
│   ├── admin/        # 관리자 대시보드 페이지
│   └── chat/         # 챗봇 페이지
├── components/       # 재사용 가능한 UI 컴포넌트
├── hooks/            # 상태 관리 및 비즈니스 로직 (useChat 등)
├── lib/              # 서버 유틸리티 (DB, Auth, Gemini, Prompts)
└── types/            # TypeScript 타입 정의
public/               # 정적 에셋 (이미지, 로티 애니메이션 등)
```

---

## 라이선스

본 프로젝트의 소유권은 해당 개발 팀에 있으며, 무단 복제 및 배포를 금합니다.
