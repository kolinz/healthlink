import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/client';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/role';

const router = Router();

// 全エンドポイントに JWT 認証 + admin 権限チェックを適用
router.use(authenticateToken, requireRole('admin'));

/**
 * @openapi
 * /assignments:
 *   get:
 *     tags: [担当割当]
 *     summary: 割当一覧
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: patient_id
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: 割当一覧
 */
router.get('/', (req: Request, res: Response) => {
  const { patient_id } = req.query;

  let query = `
    SELECT a.id, a.patient_id, a.provider_id, a.assigned_at,
           pt.username AS patient_username,
           pp.name     AS patient_name,
           pr.username AS provider_username,
           prp.name    AS provider_name,
           pr.role     AS provider_role
    FROM assignments a
    JOIN users  pt  ON pt.id  = a.patient_id
    JOIN users  pr  ON pr.id  = a.provider_id
    LEFT JOIN profiles pp  ON pp.user_id  = a.patient_id
    LEFT JOIN profiles prp ON prp.user_id = a.provider_id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (patient_id) {
    query += ' AND a.patient_id = ?';
    params.push(patient_id);
  }

  query += ' ORDER BY a.assigned_at DESC';

  const assignments = db.prepare(query).all(...params);
  return res.json(assignments);
});

/**
 * @openapi
 * /assignments:
 *   post:
 *     tags: [担当割当]
 *     summary: 割当追加
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [patient_id, provider_id]
 *             properties:
 *               patient_id:  { type: string }
 *               provider_id: { type: string }
 *     responses:
 *       201:
 *         description: 割当追加成功
 *       400:
 *         description: バリデーションエラー
 *       409:
 *         description: 既に割当済み
 */
router.post('/', (req: Request, res: Response) => {
  const { patient_id, provider_id } = req.body;

  if (!patient_id || !provider_id) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'patient_id と provider_id は必須です' });
  }

  // patient の存在・ロール確認
  const patient = db.prepare('SELECT id, role FROM users WHERE id = ?').get(patient_id) as any;
  if (!patient) {
    return res.status(404).json({ error: 'PATIENT_NOT_FOUND', message: '患者が見つかりません' });
  }
  if (patient.role !== 'patient') {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: '指定されたユーザーは患者ではありません' });
  }

  // provider の存在・ロール確認
  const provider = db.prepare('SELECT id, role FROM users WHERE id = ?').get(provider_id) as any;
  if (!provider) {
    return res.status(404).json({ error: 'PROVIDER_NOT_FOUND', message: '担当者が見つかりません' });
  }
  if (!['doctor', 'nurse'].includes(provider.role)) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: '担当者は doctor または nurse である必要があります' });
  }

  // 重複チェック
  const existing = db.prepare(
    'SELECT id FROM assignments WHERE patient_id = ? AND provider_id = ?'
  ).get(patient_id, provider_id);
  if (existing) {
    return res.status(409).json({ error: 'ALREADY_ASSIGNED', message: '既に割り当てられています' });
  }

  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO assignments (id, patient_id, provider_id, assigned_at)
    VALUES (?, ?, ?, ?)
  `).run(id, patient_id, provider_id, now);

  const assignment = db.prepare(`
    SELECT a.id, a.patient_id, a.provider_id, a.assigned_at,
           pt.username AS patient_username,
           pp.name     AS patient_name,
           pr.username AS provider_username,
           prp.name    AS provider_name,
           pr.role     AS provider_role
    FROM assignments a
    JOIN users  pt  ON pt.id  = a.patient_id
    JOIN users  pr  ON pr.id  = a.provider_id
    LEFT JOIN profiles pp  ON pp.user_id  = a.patient_id
    LEFT JOIN profiles prp ON prp.user_id = a.provider_id
    WHERE a.id = ?
  `).get(id);

  return res.status(201).json(assignment);
});

/**
 * @openapi
 * /assignments/{id}:
 *   delete:
 *     tags: [担当割当]
 *     summary: 割当解除
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: 割当解除成功
 *       404:
 *         description: 見つからない
 */
router.delete('/:id', (req: Request, res: Response) => {
  const assignment = db.prepare('SELECT id FROM assignments WHERE id = ?').get(req.params.id);
  if (!assignment) {
    return res.status(404).json({ error: 'ASSIGNMENT_NOT_FOUND' });
  }

  db.prepare('DELETE FROM assignments WHERE id = ?').run(req.params.id);
  return res.json({ message: '割当を解除しました' });
});

export default router;
