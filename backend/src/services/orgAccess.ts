import db from '../db/client';

/**
 * doctor/nurse が同一組織の患者にアクセスできるか確認する
 *
 * アクセス制御の原則:
 * - doctor/nurse のアクセス範囲は user_organizations テーブルの組織所属で制御される
 * - userId（doctor/nurse）と patientId（patient）が同一組織に所属している場合のみ true を返す
 * - adminが管理画面からメンバーシップを操作することでアクセス範囲が決まる（コードへの直接埋め込みなし）
 *
 * @param userId    アクセスしようとする doctor/nurse の userId
 * @param patientId アクセス対象の patient の userId
 * @returns 同一組織に所属していれば true
 */
export function checkSameOrg(userId: string, patientId: string): boolean {
  const result = db.prepare(`
    SELECT COUNT(*) AS cnt
    FROM user_organizations uo1
    JOIN user_organizations uo2
      ON uo1.organization_id = uo2.organization_id
    WHERE uo1.user_id = ?
      AND uo2.user_id = ?
  `).get(userId, patientId) as { cnt: number };

  return result.cnt > 0;
}

/**
 * doctor/nurse がアクセス可能な患者の ID 一覧を返す
 *
 * @param userId アクセスしようとする doctor/nurse の userId
 * @returns アクセス可能な patient の userId 配列
 */
export function getAccessiblePatientIds(userId: string): string[] {
  const rows = db.prepare(`
    SELECT DISTINCT u.id
    FROM users u
    JOIN user_organizations uo1 ON uo1.user_id = u.id
    JOIN user_organizations uo2 ON uo2.organization_id = uo1.organization_id
    WHERE uo2.user_id = ?
      AND u.role = 'patient'
      AND u.is_active = 1
      AND u.consent_agreed = 1
  `).all(userId) as { id: string }[];

  return rows.map((r) => r.id);
}
