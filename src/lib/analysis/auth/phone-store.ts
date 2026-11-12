/**
 * phone_verifications 테이블 데이터 접근 — 서버 전용.
 * 코드 원문은 저장하지 않고 해시만 저장한다(phone.ts의 hashCode). 파라미터 바인딩 필수(SQL Injection 방지).
 *
 * 동시 요청(레이스) 대응 원칙:
 * - 발송 한도(재발송 간격·일일 한도) 판정과 삽입을 SQL 한 문장으로 묶어 TOCTOU를 없앤다(`insertVerificationIfAllowed`).
 * - 시도 횟수 증가는 `UPDATE ... OUTPUT`으로 원자적으로 수행하고 그 반환값만을 판정에 쓴다(`incrementAttempts`).
 *   앱 레이어에서 읽은 stale한 attempts 값을 로컬로 +1 해서 쓰면, 동시에 들어온 여러 요청이 모두 같은
 *   낮은 값을 보고 비교를 통과해버려 사실상 무제한 코드 추측(브루트포스)이 가능해진다 — 그래서 반드시 DB가
 *   반환한 실제 값을 써야 한다.
 * - 1회용 처리도 `UPDATE ... WHERE verified_at IS NULL`의 rowsAffected로만 성공을 판정한다(`markVerified`).
 */
import sql from 'mssql';
import { getPool } from '@/lib/db';
import type { VerificationRow } from './phone';

export interface VerificationRecord extends VerificationRow {
    id: number;
}

/**
 * 재발송 간격·일일 한도 판정과 삽입을 하나의 SQL 문장으로 원자 처리한다.
 * 조건을 만족하지 못하면(최근 재발송 간격 내 발송 있음, 또는 오늘 한도 도달) 아무 행도 삽입되지 않고 null을 반환한다.
 * 시간 비교는 전부 DB 시각(`SYSUTCDATETIME()`/`DATEADD`)으로 하여 앱 서버 시계와 섞지 않는다.
 * 단, "오늘"의 경계(KST 자정)는 DB 타임존 함수로 표현하기 어려워 `todayStartUtc`(순수 함수 `kstDayStartUtc`의 결과)를
 * 바운드 파라미터로 전달해 범위 조건(`created_at >= @todayStartUtc`)으로 비교한다(인덱스를 막는 `CAST(...AS DATE)` 금지).
 */
export async function insertVerificationIfAllowed(
    phone: string,
    codeHash: string,
    ttlSec: number,
    resendIntervalSec: number,
    dailyMax: number,
    todayStartUtc: Date,
): Promise<{ id: number } | null> {
    const pool = await getPool();
    const r = await pool
        .request()
        .input('phone', sql.VarChar(20), phone)
        .input('codeHash', sql.VarChar(64), codeHash)
        .input('ttlSec', sql.Int, ttlSec)
        .input('resendIntervalSec', sql.Int, resendIntervalSec)
        .input('dailyMax', sql.Int, dailyMax)
        .input('todayStartUtc', sql.DateTime, todayStartUtc)
        .query(`
            INSERT INTO phone_verifications (phone, code_hash, expires_at)
            OUTPUT INSERTED.id
            SELECT @phone, @codeHash, DATEADD(SECOND, @ttlSec, SYSUTCDATETIME())
            WHERE NOT EXISTS (
                SELECT 1 FROM phone_verifications
                WHERE phone = @phone AND created_at >= DATEADD(SECOND, -@resendIntervalSec, SYSUTCDATETIME())
            )
            AND (
                SELECT COUNT(*) FROM phone_verifications
                WHERE phone = @phone AND created_at >= @todayStartUtc
            ) < @dailyMax
        `);
    const row = r.recordset[0] as { id: number } | undefined;
    return row ? { id: row.id } : null;
}

/** 방금 삽입한 행을 삭제한다(문자 발송 실패 시 한도 소진 방지용 롤백). */
export async function deleteVerification(id: number): Promise<void> {
    const pool = await getPool();
    await pool.request().input('id', sql.Int, id).query('DELETE FROM phone_verifications WHERE id = @id');
}

/** 해당 번호의 가장 최근 인증 행을 반환한다(없으면 null). */
export async function latestVerification(phone: string): Promise<VerificationRecord | null> {
    const pool = await getPool();
    const r = await pool
        .request()
        .input('phone', sql.VarChar(20), phone)
        .query(`
            SELECT TOP 1 id, code_hash, attempts, expires_at, verified_at
            FROM phone_verifications
            WHERE phone = @phone
            ORDER BY created_at DESC, id DESC
        `);
    return (r.recordset[0] as VerificationRecord | undefined) ?? null;
}

/**
 * 확인 시도 횟수를 원자적으로 1 증가시키고 증가된 값을 반환한다(비교 전에 먼저 호출해야 한다).
 * 이미 사용 완료된 행(verified_at IS NOT NULL)이거나 존재하지 않는 id면 아무 것도 증가시키지 않고 null을 반환한다
 * — 호출부는 이 경우 비교 자체를 하지 말고 실패로 처리해야 한다.
 */
export async function incrementAttempts(id: number): Promise<number | null> {
    const pool = await getPool();
    const r = await pool.request().input('id', sql.Int, id).query(`
        UPDATE phone_verifications SET attempts = attempts + 1
        OUTPUT INSERTED.attempts
        WHERE id = @id AND verified_at IS NULL
    `);
    const row = r.recordset[0] as { attempts: number } | undefined;
    return row ? row.attempts : null;
}

/**
 * 코드를 사용 완료 처리한다(재사용 방지). 이미 사용된 행이면 아무 것도 갱신하지 않는다.
 * @returns 이번 호출로 실제 갱신됐으면 true(동시 요청 중 단 하나만 true를 받는다), 아니면 false.
 */
export async function markVerified(id: number): Promise<boolean> {
    const pool = await getPool();
    const r = await pool.request().input('id', sql.Int, id).query(`
        UPDATE phone_verifications SET verified_at = SYSUTCDATETIME()
        WHERE id = @id AND verified_at IS NULL
    `);
    return (r.rowsAffected[0] ?? 0) === 1;
}
