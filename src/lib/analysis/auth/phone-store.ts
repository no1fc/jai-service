/**
 * phone_verifications 테이블 데이터 접근 — 서버 전용.
 * 코드 원문은 저장하지 않고 해시만 저장한다(phone.ts의 hashCode). 파라미터 바인딩 필수(SQL Injection 방지).
 */
import sql from 'mssql';
import { getPool } from '@/lib/db';
import type { VerificationRow } from './phone';

export interface VerificationRecord extends VerificationRow {
    id: number;
}

/** 인증 코드 행을 생성하고 id를 반환한다. 코드 원문이 아니라 해시(codeHash)만 저장한다. */
export async function insertVerification(phone: string, codeHash: string, ttlSec: number): Promise<{ id: number }> {
    const pool = await getPool();
    const r = await pool
        .request()
        .input('phone', sql.VarChar(20), phone)
        .input('codeHash', sql.VarChar(64), codeHash)
        .input('ttlSec', sql.Int, ttlSec)
        .query(`
            INSERT INTO phone_verifications (phone, code_hash, expires_at)
            OUTPUT INSERTED.id
            VALUES (@phone, @codeHash, DATEADD(SECOND, @ttlSec, SYSUTCDATETIME()))
        `);
    return { id: r.recordset[0].id };
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

/** 확인 시도 횟수를 1 증가시킨다(비교 전에 먼저 호출해야 한다). */
export async function incrementAttempts(id: number): Promise<void> {
    const pool = await getPool();
    await pool.request().input('id', sql.Int, id).query(`
        UPDATE phone_verifications SET attempts = attempts + 1 WHERE id = @id
    `);
}

/** 코드를 사용 완료 처리한다(재사용 방지). */
export async function markVerified(id: number): Promise<void> {
    const pool = await getPool();
    await pool.request().input('id', sql.Int, id).query(`
        UPDATE phone_verifications SET verified_at = SYSUTCDATETIME() WHERE id = @id
    `);
}

/** 오늘(UTC 기준) 해당 번호로 발송된 건수를 반환한다. */
export async function countSentToday(phone: string): Promise<number> {
    const pool = await getPool();
    const r = await pool
        .request()
        .input('phone', sql.VarChar(20), phone)
        .query(`
            SELECT COUNT(*) AS count FROM phone_verifications
            WHERE phone = @phone AND CAST(created_at AS DATE) = CAST(SYSUTCDATETIME() AS DATE)
        `);
    return r.recordset[0].count as number;
}

/** 마지막 발송으로부터 경과한 초. 발송 기록이 없으면 Infinity(제한 없음). */
export async function secondsSinceLastSend(phone: string): Promise<number> {
    const pool = await getPool();
    const r = await pool
        .request()
        .input('phone', sql.VarChar(20), phone)
        .query(`
            SELECT TOP 1 created_at FROM phone_verifications
            WHERE phone = @phone
            ORDER BY created_at DESC
        `);
    const row = r.recordset[0] as { created_at: Date } | undefined;
    if (!row) return Infinity;
    return (Date.now() - row.created_at.getTime()) / 1000;
}
