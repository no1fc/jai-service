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
```

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

`leads`는 신청일로부터 1년 보관 후 파기한다 (`created_at`은 UTC 저장, 아래는 UTC 기준 수동 SQL — 자동 배치는 `docs/ISSUES.md`의 JAI-01 참고).

```sql
DELETE FROM leads WHERE created_at < DATEADD(year, -1, SYSUTCDATETIME());
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
