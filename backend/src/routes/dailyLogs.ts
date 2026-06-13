import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/client';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { checkSameOrg } from '../services/orgAccess';

const router = Router();

// 全エンドポイントに JWT 認証を適用
router.use(authenticateToken);

// steps_yesterday の有効値
const VALID_STEPS = ['under_2000', '2000_4000', '4000_6000', '6000_8000', 'over_8000'];

// スコアが 1〜10 の整数かチェック
function isValidScore(val: any): boolean {
  const n = Number(val);
  return Number.isInteger(n) && n >= 1 && n <= 10;
}

/**
 * @openapi
 * /daily-logs:
 *   get:
 *     tags: [体調ログ]
 *     summary: 自分の体調ログ一覧（patient）
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: ログ一覧
 */
router.get('/', requireRole('patient'), (req: Request, res: Response) => {
  const { from, to } = req.query;

  let query = `
    SELECT * FROM daily_logs
    WHERE patient_id = ?
  `;
  const params: any[] = [req.user!.userId];

  if (from) { query += ' AND logged_at >= ?'; params.push(from); }
  if (to)   { query += ' AND logged_at <= ?'; params.push(to); }

  query += ' ORDER BY logged_at DESC';

  const logs = db.prepare(query).all(...params);
  return res.json(logs);
});

/**
 * @openapi
 * /daily-logs:
 *   post:
 *     tags: [体調ログ]
 *     summary: 体調入力（patient）
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fever_score, steps_yesterday, condition, appetite_score, sleep_quality, attention_score]
 *             properties:
 *               fever_score:     { type: integer, minimum: 1, maximum: 10 }
 *               steps_yesterday: { type: string, enum: [under_2000, 2000_4000, 4000_6000, 6000_8000, over_8000] }
 *               condition:       { type: integer, minimum: 1, maximum: 10 }
 *               appetite_score:  { type: integer, minimum: 1, maximum: 10 }
 *               sleep_quality:   { type: integer, minimum: 1, maximum: 10 }
 *               attention_score: { type: integer, minimum: 1, maximum: 10 }
 *               note:            { type: string, nullable: true }
 *     responses:
 *       201:
 *         description: 体調入力成功
 *       400:
 *         description: バリデーションエラー
 */
router.post('/', requireRole('patient'), (req: Request, res: Response) => {
  const { fever_score, steps_yesterday, condition, appetite_score, sleep_quality, attention_score, note } = req.body;

  // バリデーション
  if (!isValidScore(fever_score)) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'fever_score は 1〜10 の整数で必須です' });
  }
  if (!steps_yesterday || !VALID_STEPS.includes(steps_yesterday)) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'steps_yesterday は有効な値で必須です' });
  }
  if (!isValidScore(condition)) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'condition は 1〜10 の整数で必須です' });
  }
  if (!isValidScore(appetite_score)) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'appetite_score は 1〜10 の整数で必須です' });
  }
  if (!isValidScore(sleep_quality)) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'sleep_quality は 1〜10 の整数で必須です' });
  }
  if (!isValidScore(attention_score)) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'attention_score は 1〜10 の整数で必須です' });
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO daily_logs (
      id, patient_id, logged_at,
      fever_score, steps_yesterday, condition,
      appetite_score, sleep_quality, attention_score,
      note, status
    ) VALUES (
      @id, @patient_id, DATETIME('now'),
      @fever_score, @steps_yesterday, @condition,
      @appetite_score, @sleep_quality, @attention_score,
      @note, 'unchecked'
    )
  `).run({
    id,
    patient_id: req.user!.userId,
    fever_score: Number(fever_score),
    steps_yesterday,
    condition: Number(condition),
    appetite_score: Number(appetite_score),
    sleep_quality: Number(sleep_quality),
    attention_score: Number(attention_score),
    note: note ?? null,
  });

  const log = db.prepare('SELECT * FROM daily_logs WHERE id = ?').get(id);
  return res.status(201).json(log);
});

/**
 * @openapi
 * /daily-logs/{id}:
 *   get:
 *     tags: [体調ログ]
 *     summary: 体調ログ詳細
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: ログ詳細
 *       403:
 *         description: アクセス権限なし
 *       404:
 *         description: 見つからない
 */
router.get('/:id', (req: Request, res: Response) => {
  const log = db.prepare('SELECT * FROM daily_logs WHERE id = ?').get(req.params.id) as any;
  if (!log) {
    return res.status(404).json({ error: 'LOG_NOT_FOUND' });
  }

  const { role, userId } = req.user!;

  if (role === 'patient') {
    // patient は自分のログのみ参照可
    if (log.patient_id !== userId) {
      return res.status(403).json({ error: 'FORBIDDEN' });
    }
  } else if (role === 'doctor' || role === 'nurse') {
    // 同意チェック
    const patient = db.prepare('SELECT consent_agreed FROM users WHERE id = ?').get(log.patient_id) as any;
    if (!patient || patient.consent_agreed === 0) {
      return res.status(403).json({ error: 'CONSENT_REQUIRED' });
    }
    // 同一組織チェック
    if (!checkSameOrg(userId, log.patient_id)) {
      return res.status(403).json({ error: 'FORBIDDEN' });
    }
  } else if (role !== 'admin') {
    return res.status(403).json({ error: 'FORBIDDEN' });
  }

  return res.json(log);
});

/**
 * @openapi
 * /daily-logs/{id}/status:
 *   put:
 *     tags: [体調ログ]
 *     summary: ステータス更新（doctor / nurse）
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [unchecked, checked, responded] }
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.put('/:id/status', requireRole('doctor', 'nurse'), (req: Request, res: Response) => {
  const { status } = req.body;
  const validStatuses = ['unchecked', 'checked', 'responded'];

  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'status は unchecked / checked / responded のいずれかです' });
  }

  const log = db.prepare('SELECT * FROM daily_logs WHERE id = ?').get(req.params.id) as any;
  if (!log) {
    return res.status(404).json({ error: 'LOG_NOT_FOUND' });
  }

  // 同意チェック
  const patient = db.prepare('SELECT consent_agreed FROM users WHERE id = ?').get(log.patient_id) as any;
  if (!patient || patient.consent_agreed === 0) {
    return res.status(403).json({ error: 'CONSENT_REQUIRED' });
  }

  // 同一組織チェック
  if (!checkSameOrg(req.user!.userId, log.patient_id)) {
    return res.status(403).json({ error: 'FORBIDDEN' });
  }

  db.prepare(`
    UPDATE daily_logs
    SET status = ?, status_updated_by = ?, status_updated_at = DATETIME('now')
    WHERE id = ?
  `).run(status, req.user!.userId, req.params.id);

  const updated = db.prepare('SELECT * FROM daily_logs WHERE id = ?').get(req.params.id);
  return res.json(updated);
});

/**
 * @openapi
 * /daily-logs/{id}/notes:
 *   get:
 *     tags: [体調ログ]
 *     summary: メモ一覧（doctor / nurse）
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: メモ一覧
 */
router.get('/:id/notes', requireRole('doctor', 'nurse'), (req: Request, res: Response) => {
  const log = db.prepare('SELECT * FROM daily_logs WHERE id = ?').get(req.params.id) as any;
  if (!log) {
    return res.status(404).json({ error: 'LOG_NOT_FOUND' });
  }

  const patient = db.prepare('SELECT consent_agreed FROM users WHERE id = ?').get(log.patient_id) as any;
  if (!patient || patient.consent_agreed === 0) {
    return res.status(403).json({ error: 'CONSENT_REQUIRED' });
  }

  if (!checkSameOrg(req.user!.userId, log.patient_id)) {
    return res.status(403).json({ error: 'FORBIDDEN' });
  }

  const notes = db.prepare(`
    SELECT mn.id, mn.daily_log_id, mn.provider_id, mn.note, mn.created_at, mn.updated_at,
           u.username AS provider_username, p.name AS provider_name
    FROM medical_notes mn
    JOIN users u ON u.id = mn.provider_id
    LEFT JOIN profiles p ON p.user_id = mn.provider_id
    WHERE mn.daily_log_id = ?
    ORDER BY mn.created_at ASC
  `).all(req.params.id);

  return res.json(notes);
});

/**
 * @openapi
 * /daily-logs/{id}/notes:
 *   post:
 *     tags: [体調ログ]
 *     summary: メモ追加（doctor / nurse）
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [note]
 *             properties:
 *               note: { type: string }
 *     responses:
 *       201:
 *         description: メモ追加成功
 */
router.post('/:id/notes', requireRole('doctor', 'nurse'), (req: Request, res: Response) => {
  const { note } = req.body;

  if (!note) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'note は必須です' });
  }

  const log = db.prepare('SELECT * FROM daily_logs WHERE id = ?').get(req.params.id) as any;
  if (!log) {
    return res.status(404).json({ error: 'LOG_NOT_FOUND' });
  }

  const patient = db.prepare('SELECT consent_agreed FROM users WHERE id = ?').get(log.patient_id) as any;
  if (!patient || patient.consent_agreed === 0) {
    return res.status(403).json({ error: 'CONSENT_REQUIRED' });
  }

  if (!checkSameOrg(req.user!.userId, log.patient_id)) {
    return res.status(403).json({ error: 'FORBIDDEN' });
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO medical_notes (id, daily_log_id, provider_id, note, created_at)
    VALUES (?, ?, ?, ?, DATETIME('now'))
  `).run(id, req.params.id, req.user!.userId, note);

  const created = db.prepare('SELECT * FROM medical_notes WHERE id = ?').get(id);
  return res.status(201).json(created);
});

/**
 * @openapi
 * /daily-logs/{id}/notes/{noteId}:
 *   put:
 *     tags: [体調ログ]
 *     summary: メモ更新（作成者のみ）
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: noteId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [note]
 *             properties:
 *               note: { type: string }
 *     responses:
 *       200:
 *         description: メモ更新成功
 *       403:
 *         description: 作成者以外は更新不可
 */
router.put('/:id/notes/:noteId', requireRole('doctor', 'nurse'), (req: Request, res: Response) => {
  const { note } = req.body;

  if (!note) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'note は必須です' });
  }

  const existing = db.prepare('SELECT * FROM medical_notes WHERE id = ? AND daily_log_id = ?').get(req.params.noteId, req.params.id) as any;
  if (!existing) {
    return res.status(404).json({ error: 'NOTE_NOT_FOUND' });
  }

  // 作成者のみ更新可
  if (existing.provider_id !== req.user!.userId) {
    return res.status(403).json({ error: 'FORBIDDEN', message: 'メモの作成者のみ更新できます' });
  }

  db.prepare(`
    UPDATE medical_notes SET note = ?, updated_at = DATETIME('now') WHERE id = ?
  `).run(note, req.params.noteId);

  const updated = db.prepare('SELECT * FROM medical_notes WHERE id = ?').get(req.params.noteId);
  return res.json(updated);
});

export default router;
