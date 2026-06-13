import { Router, Request, Response } from 'express';
import db from '../db/client';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/role';

const router = Router();

/**
 * @openapi
 * /system-settings:
 *   get:
 *     tags: [システム設定]
 *     summary: システム設定一覧取得（admin）
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: システム設定一覧
 */
router.get('/', authenticateToken, requireRole('admin'), (req: Request, res: Response) => {
  const settings = db.prepare('SELECT key, value, updated_at FROM system_settings').all();
  return res.json(settings);
});

/**
 * @openapi
 * /system-settings/{key}:
 *   put:
 *     tags: [システム設定]
 *     summary: システム設定更新（admin）
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [value]
 *             properties:
 *               value: { type: string }
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.put('/:key', authenticateToken, requireRole('admin'), (req: Request, res: Response) => {
  const { value } = req.body;

  if (value === undefined || value === null) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'value は必須です' });
  }

  db.prepare(`
    INSERT OR REPLACE INTO system_settings (key, value, updated_at)
    VALUES (?, ?, DATETIME('now'))
  `).run(req.params.key, value);

  const updated = db.prepare('SELECT key, value, updated_at FROM system_settings WHERE key = ?').get(req.params.key);
  return res.json(updated);
});

export default router;
