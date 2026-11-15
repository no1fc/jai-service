#!/usr/bin/env bash
# 서버에서 실행하는 배포 스크립트. GitHub Actions(deploy.yml)가 git 최신화 후 호출하며, 서버에서 직접 실행해도 된다.
# .env.local은 git이 추적하지 않으므로 git reset --hard에 영향받지 않는다.
# ponytail: 같은 .next에 빌드하므로 빌드 중 짧게 500이 날 수 있다(배포.md 7단계 방법 A와 동일). 무중단이 필요하면 별도 폴더 빌드 후 교체로 바꾼다.
set -euo pipefail

APP_NAME="ness-chatbot"
cd "$(dirname "$0")/.."

echo "▶ $(git log --oneline -1)"
# ponytail: npm ci 대신 npm install — Windows에서 만든 lockfile에 Linux 전용 선택 의존성이 빠져 있다(ci.yml 참고). 바뀐 lockfile은 다음 배포의 git reset으로 되돌아간다.
npm install --no-audit --no-fund
npm run build

if pm2 describe "$APP_NAME" > /dev/null 2>&1; then
    pm2 reload "$APP_NAME"
else
    PORT=3000 pm2 start npm --name "$APP_NAME" -- start
fi
pm2 save
echo "✔ 배포 완료"
