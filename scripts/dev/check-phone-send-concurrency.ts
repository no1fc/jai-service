/**
 * 로컬 전용 동시성 검증 스크립트 — `insertVerificationIfAllowed`(phone-store.ts)의
 * "재발송 간격·일일 한도 판정 + 삽입" 원자성(WITH (UPDLOCK, HOLDLOCK) 키-범위 락)이 실제로
 * 레이스 상황에서 단 1건만 통과시키는지 로컬 DB로 직접 확인한다.
 *
 * 에이전트는 이 스크립트를 실행하지 않는다 — 사용자가 직접 실행한다.
 * 실행: npx tsx scripts/dev/check-phone-send-concurrency.ts
 *
 * 동작:
 *   1) MSSQL_HOST가 localhost가 아니면 즉시 종료(운영 DB 오염 방지).
 *   2) 테스트 번호(01000000000)의 기존 행을 삭제.
 *   3) 같은 번호로 insertVerificationIfAllowed를 Promise.all 10건 동시 호출.
 *   4) 실제로 생성된 행 수를 출력(기대값 1).
 *   5) 테스트 행을 다시 삭제하고 커넥션을 닫는다.
 */
import dotenv from 'dotenv';
import sql from 'mssql';

// 정적 import는 호이스팅되어 dotenv보다 먼저 db.ts가 env를 읽으므로, env를 채운 뒤 동적 import한다.
dotenv.config({ path: '.env.local' });
const loadDb = () => import('../../src/lib/db');

const TEST_PHONE = '01000000000';
const CONCURRENCY = 10;
const TTL_SEC = 180;
const RESEND_INTERVAL_SEC = 60;
const DAILY_MAX = 5;

async function deleteTestRows(): Promise<void> {
    const pool = await (await loadDb()).getPool();
    await pool.request().input('phone', sql.VarChar(20), TEST_PHONE).query('DELETE FROM phone_verifications WHERE phone = @phone');
}

async function main(): Promise<void> {
    const host = process.env.MSSQL_HOST;
    if (host !== 'localhost') {
        console.error(`MSSQL_HOST가 localhost가 아닙니다(현재: ${host ?? '(미설정)'}). 로컬 DB에서만 실행하세요.`);
        process.exitCode = 1;
        return;
    }

    const { kstDayStartUtc } = await import('../../src/lib/analysis/auth/phone');
    const { insertVerificationIfAllowed } = await import('../../src/lib/analysis/auth/phone-store');
    await deleteTestRows();

    const results = await Promise.all(
        Array.from({ length: CONCURRENCY }, () =>
            insertVerificationIfAllowed(TEST_PHONE, 'dummy-hash', TTL_SEC, RESEND_INTERVAL_SEC, DAILY_MAX, kstDayStartUtc(new Date())),
        ),
    );
    const createdCount = results.filter((r) => r !== null).length;
    console.log(`생성된 행 수: ${createdCount} (기대값: 1)`);

    await deleteTestRows();
    const pool = await (await loadDb()).getPool();
    await pool.close();
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
