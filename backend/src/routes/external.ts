import { Router, Request, Response } from 'express';
import db from '../db/client';
import { authenticateApiKey } from '../middleware/apiKey';

const router = Router();

// 全エンドポイントに APIキー認証を適用
router.use(authenticateApiKey);

// ページネーションヘルパー
function getPagination(query: any): { page: number; limit: number; offset: number } {
  const page  = Math.max(1, parseInt(query.page  as string) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(query.limit as string) || 50));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function paginatedResponse(data: any[], total: number, page: number, limit: number) {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * @openapi
 * /external/patients:
 *   get:
 *     tags: [外部連携API]
 *     summary: 患者一覧（プロフィール含む）
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50, maximum: 200 }
 *     responses:
 *       200:
 *         description: 患者一覧
 */
router.get('/patients', (req: Request, res: Response) => {
  const { page, limit, offset } = getPagination(req.query);

  // consent_agreed=1 の患者のみ返す
  const total = (db.prepare(`
    SELECT COUNT(*) AS cnt FROM users
    WHERE role = 'patient' AND is_active = 1 AND consent_agreed = 1
  `).get() as any).cnt;

  const patients = db.prepare(`
    SELECT u.id, u.username, u.role, u.is_active,
           u.consent_agreed, u.consent_agreed_at, u.consent_version, u.created_at,
           p.name, p.email, p.age, p.preferred_communication
    FROM users u
    LEFT JOIN profiles p ON p.user_id = u.id
    WHERE u.role = 'patient' AND u.is_active = 1 AND u.consent_agreed = 1
    ORDER BY u.created_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);

  return res.json(paginatedResponse(patients, total, page, limit));
});

/**
 * @openapi
 * /external/patients/{id}:
 *   get:
 *     tags: [外部連携API]
 *     summary: 患者詳細
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: 患者詳細
 *       403:
 *         description: 同意なし
 *       404:
 *         description: 見つからない
 */
router.get('/patients/:id', (req: Request, res: Response) => {
  const patient = db.prepare(`
    SELECT u.id, u.username, u.role, u.is_active,
           u.consent_agreed, u.consent_agreed_at, u.consent_version, u.created_at,
           p.name, p.email, p.age, p.preferred_communication
    FROM users u
    LEFT JOIN profiles p ON p.user_id = u.id
    WHERE u.id = ? AND u.role = 'patient'
  `).get(req.params.id) as any;

  if (!patient) {
    return res.status(404).json({ error: 'PATIENT_NOT_FOUND' });
  }

  // consent_agreed=0 の患者データは外部連携APIからも返さない
  if (patient.consent_agreed === 0) {
    return res.status(403).json({ error: 'CONSENT_REQUIRED' });
  }

  return res.json(patient);
});

/**
 * @openapi
 * /external/daily-logs:
 *   get:
 *     tags: [外部連携API]
 *     summary: 体調ログ一覧
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: patient_id
 *         schema: { type: string }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50, maximum: 200 }
 *     responses:
 *       200:
 *         description: 体調ログ一覧
 */
router.get('/daily-logs', (req: Request, res: Response) => {
  const { patient_id, from, to } = req.query;
  const { page, limit, offset } = getPagination(req.query);

  // consent_agreed=1 の患者のログのみ返す
  let whereClause = `
    WHERE u.consent_agreed = 1 AND u.is_active = 1
  `;
  const params: any[] = [];

  if (patient_id) { whereClause += ' AND dl.patient_id = ?'; params.push(patient_id); }
  if (from)       { whereClause += ' AND dl.logged_at >= ?'; params.push(from); }
  if (to)         { whereClause += ' AND dl.logged_at <= ?'; params.push(to); }

  const countQuery = `
    SELECT COUNT(*) AS cnt
    FROM daily_logs dl
    JOIN users u ON u.id = dl.patient_id
    ${whereClause}
  `;
  const total = (db.prepare(countQuery).get(...params) as any).cnt;

  const dataQuery = `
    SELECT dl.*
    FROM daily_logs dl
    JOIN users u ON u.id = dl.patient_id
    ${whereClause}
    ORDER BY dl.logged_at DESC
    LIMIT ? OFFSET ?
  `;
  const logs = db.prepare(dataQuery).all(...params, limit, offset);

  return res.json(paginatedResponse(logs, total, page, limit));
});

/**
 * @openapi
 * /external/daily-logs/{id}:
 *   get:
 *     tags: [外部連携API]
 *     summary: 体調ログ詳細
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: 体調ログ詳細
 *       403:
 *         description: 同意なし
 *       404:
 *         description: 見つからない
 */
router.get('/daily-logs/:id', (req: Request, res: Response) => {
  const log = db.prepare(`
    SELECT dl.*
    FROM daily_logs dl
    JOIN users u ON u.id = dl.patient_id
    WHERE dl.id = ?
  `).get(req.params.id) as any;

  if (!log) {
    return res.status(404).json({ error: 'LOG_NOT_FOUND' });
  }

  // consent_agreed=0 の患者データは返さない
  const patient = db.prepare('SELECT consent_agreed FROM users WHERE id = ?').get(log.patient_id) as any;
  if (!patient || patient.consent_agreed === 0) {
    return res.status(403).json({ error: 'CONSENT_REQUIRED' });
  }

  return res.json(log);
});

/**
 * @openapi
 * /external/consultations:
 *   get:
 *     tags: [外部連携API]
 *     summary: AI相談セッション一覧
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: patient_id
 *         schema: { type: string }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50, maximum: 200 }
 *     responses:
 *       200:
 *         description: AI相談セッション一覧
 */
router.get('/consultations', (req: Request, res: Response) => {
  const { patient_id, from, to } = req.query;
  const { page, limit, offset } = getPagination(req.query);

  let whereClause = `
    WHERE u.consent_agreed = 1 AND u.is_active = 1
  `;
  const params: any[] = [];

  if (patient_id) { whereClause += ' AND ac.patient_id = ?';  params.push(patient_id); }
  if (from)       { whereClause += ' AND ac.started_at >= ?'; params.push(from); }
  if (to)         { whereClause += ' AND ac.started_at <= ?'; params.push(to); }

  const countQuery = `
    SELECT COUNT(*) AS cnt
    FROM ai_consultations ac
    JOIN users u ON u.id = ac.patient_id
    ${whereClause}
  `;
  const total = (db.prepare(countQuery).get(...params) as any).cnt;

  const dataQuery = `
    SELECT ac.id, ac.patient_id, ac.ai_provider_id, ac.topic_id,
           ac.risk_level, ac.summary, ac.started_at,
           ct.label AS topic_label
    FROM ai_consultations ac
    JOIN users u ON u.id = ac.patient_id
    LEFT JOIN consultation_topics ct ON ct.id = ac.topic_id
    ${whereClause}
    ORDER BY ac.started_at DESC
    LIMIT ? OFFSET ?
  `;
  const consultations = db.prepare(dataQuery).all(...params, limit, offset);

  return res.json(paginatedResponse(consultations, total, page, limit));
});

/**
 * @openapi
 * /external/consultations/{id}:
 *   get:
 *     tags: [外部連携API]
 *     summary: AI相談詳細（メッセージ含む）
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: AI相談詳細
 *       403:
 *         description: 同意なし
 *       404:
 *         description: 見つからない
 */
router.get('/consultations/:id', (req: Request, res: Response) => {
  const consultation = db.prepare(`
    SELECT ac.id, ac.patient_id, ac.ai_provider_id, ac.topic_id,
           ac.risk_level, ac.summary, ac.started_at,
           ct.label AS topic_label
    FROM ai_consultations ac
    LEFT JOIN consultation_topics ct ON ct.id = ac.topic_id
    WHERE ac.id = ?
  `).get(req.params.id) as any;

  if (!consultation) {
    return res.status(404).json({ error: 'CONSULTATION_NOT_FOUND' });
  }

  // consent_agreed=0 の患者データは返さない
  const patient = db.prepare('SELECT consent_agreed FROM users WHERE id = ?').get(consultation.patient_id) as any;
  if (!patient || patient.consent_agreed === 0) {
    return res.status(403).json({ error: 'CONSENT_REQUIRED' });
  }

  const messages = db.prepare(`
    SELECT id, consultation_id, role, content, created_at
    FROM ai_messages
    WHERE consultation_id = ?
    ORDER BY created_at ASC
  `).all(req.params.id);

  return res.json({ ...consultation, messages });
});

export default router;
