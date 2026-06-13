import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/client';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/role';

const router = Router();

// 全エンドポイントに JWT 認証 + admin 権限チェックを適用
router.use(authenticateToken, requireRole('admin'));

/**
 * @openapi
 * /api-keys:
 *   get:
 *     tags: [APIキー管理]
 *     summary: APIキー一覧（key_hash は返さない）
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: APIキー一覧
 */
router.get('/', (req: Request, res: Response) => {
  // key_hash はセキュリティ上返さない
  const keys = db.prepare(`
    SELECT id, name, is_active, last_used_at, created_by, created_at, expires_at
    FROM api_keys
    ORDER BY created_at DESC
  `).all();
  return res.json(keys);
});

/**
 * @openapi
 * /api-keys:
 *   post:
 *     tags: [APIキー管理]
 *     summary: APIキー発行（生のキーを1回だけ返す）
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:       { type: string }
 *               expires_at: { type: string, nullable: true, format: date-time }
 *     responses:
 *       201:
 *         description: 発行成功（生のキーはこの1回のみ返す）
 */
router.post('/', (req: Request, res: Response) => {
  const { name, expires_at } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'name は必須です' });
  }

  // APIキー生成: crypto.randomBytes(32) → 64文字の16進数
  const rawKey = crypto.randomBytes(32).toString('hex');
  // DBには SHA-256 ハッシュのみ保存（生のキーは保存しない）
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO api_keys (id, name, key_hash, is_active, created_by, created_at, expires_at)
    VALUES (?, ?, ?, 1, ?, ?, ?)
  `).run(id, name, keyHash, req.user!.userId, now, expires_at ?? null);

  // 生のキーはこのレスポンスの1回のみ返す（以降は再表示不可）
  return res.status(201).json({
    id,
    name,
    key: rawKey,
    expires_at: expires_at ?? null,
    created_at: now,
  });
});

/**
 * @openapi
 * /api-keys/{id}:
 *   put:
 *     tags: [APIキー管理]
 *     summary: 名称・有効期限の更新
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
 *               name:       { type: string }
 *               expires_at: { type: string, nullable: true, format: date-time }
 *     responses:
 *       200:
 *         description: 更新成功
 *       404:
 *         description: 見つからない
 */
router.put('/:id', (req: Request, res: Response) => {
  const { name, expires_at } = req.body;

  const apiKey = db.prepare('SELECT id FROM api_keys WHERE id = ?').get(req.params.id);
  if (!apiKey) {
    return res.status(404).json({ error: 'API_KEY_NOT_FOUND' });
  }

  const fields: string[] = [];
  const params: any[] = [];
  if (name !== undefined)       { fields.push('name = ?');       params.push(name); }
  if (expires_at !== undefined) { fields.push('expires_at = ?'); params.push(expires_at ?? null); }

  if (fields.length === 0) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: '更新するフィールドがありません' });
  }

  params.push(req.params.id);
  db.prepare(`UPDATE api_keys SET ${fields.join(', ')} WHERE id = ?`).run(...params);

  const updated = db.prepare(`
    SELECT id, name, is_active, last_used_at, created_by, created_at, expires_at
    FROM api_keys WHERE id = ?
  `).get(req.params.id);

  return res.json(updated);
});

/**
 * @openapi
 * /api-keys/{id}:
 *   delete:
 *     tags: [APIキー管理]
 *     summary: APIキー失効（is_active=0。レコードは削除しない）
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: 失効成功
 *       404:
 *         description: 見つからない
 */
router.delete('/:id', (req: Request, res: Response) => {
  const apiKey = db.prepare('SELECT id FROM api_keys WHERE id = ?').get(req.params.id);
  if (!apiKey) {
    return res.status(404).json({ error: 'API_KEY_NOT_FOUND' });
  }

  // レコードは削除せず is_active=0 に更新（監査証跡を保持）
  db.prepare('UPDATE api_keys SET is_active = 0 WHERE id = ?').run(req.params.id);

  return res.json({ message: 'APIキーを失効させました' });
});

export default router;
