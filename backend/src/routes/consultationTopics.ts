import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/client';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/role';

const router = Router();

router.use(authenticateToken);

/**
 * @openapi
 * /consultation-topics:
 *   get:
 *     tags: [相談トピック]
 *     summary: トピック一覧（is_active=1のみ・全員）
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: トピック一覧
 */
router.get('/', (req: Request, res: Response) => {
  const topics = db.prepare(`
    SELECT id, label, icon, sort_order, is_active, created_at
    FROM consultation_topics
    WHERE is_active = 1
    ORDER BY sort_order ASC
  `).all();
  return res.json(topics);
});

/**
 * @openapi
 * /consultation-topics:
 *   post:
 *     tags: [相談トピック]
 *     summary: トピック作成（admin）
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [label]
 *             properties:
 *               label:      { type: string }
 *               icon:       { type: string, nullable: true }
 *               sort_order: { type: integer }
 *     responses:
 *       201:
 *         description: 作成成功
 */
router.post('/', requireRole('admin'), (req: Request, res: Response) => {
  const { label, icon, sort_order } = req.body;

  if (!label) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'label は必須です' });
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO consultation_topics (id, label, icon, sort_order, is_active, created_at)
    VALUES (?, ?, ?, ?, 1, DATETIME('now'))
  `).run(id, label, icon ?? null, sort_order ?? 0);

  const topic = db.prepare('SELECT * FROM consultation_topics WHERE id = ?').get(id);
  return res.status(201).json(topic);
});

/**
 * @openapi
 * /consultation-topics/{id}:
 *   put:
 *     tags: [相談トピック]
 *     summary: トピック更新（admin）
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
 *             properties:
 *               label:      { type: string }
 *               icon:       { type: string, nullable: true }
 *               sort_order: { type: integer }
 *               is_active:  { type: integer, enum: [0, 1] }
 *     responses:
 *       200:
 *         description: 更新成功
 *       404:
 *         description: 見つからない
 */
router.put('/:id', requireRole('admin'), (req: Request, res: Response) => {
  const { label, icon, sort_order, is_active } = req.body;

  const topic = db.prepare('SELECT id FROM consultation_topics WHERE id = ?').get(req.params.id);
  if (!topic) {
    return res.status(404).json({ error: 'TOPIC_NOT_FOUND' });
  }

  const fields: string[] = [];
  const params: any[] = [];
  if (label !== undefined)      { fields.push('label = ?');      params.push(label); }
  if (icon !== undefined)       { fields.push('icon = ?');       params.push(icon); }
  if (sort_order !== undefined) { fields.push('sort_order = ?'); params.push(sort_order); }
  if (is_active !== undefined)  { fields.push('is_active = ?');  params.push(Number(is_active)); }

  if (fields.length === 0) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: '更新するフィールドがありません' });
  }

  params.push(req.params.id);
  db.prepare(`UPDATE consultation_topics SET ${fields.join(', ')} WHERE id = ?`).run(...params);

  const updated = db.prepare('SELECT * FROM consultation_topics WHERE id = ?').get(req.params.id);
  return res.json(updated);
});

/**
 * @openapi
 * /consultation-topics/{id}:
 *   delete:
 *     tags: [相談トピック]
 *     summary: トピック削除（admin）
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: 削除成功
 *       404:
 *         description: 見つからない
 */
router.delete('/:id', requireRole('admin'), (req: Request, res: Response) => {
  const topic = db.prepare('SELECT id FROM consultation_topics WHERE id = ?').get(req.params.id);
  if (!topic) {
    return res.status(404).json({ error: 'TOPIC_NOT_FOUND' });
  }

  db.prepare('DELETE FROM consultation_topics WHERE id = ?').run(req.params.id);
  return res.json({ message: 'トピックを削除しました' });
});

export default router;
