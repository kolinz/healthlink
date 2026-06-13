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
 * /ai/providers:
 *   get:
 *     tags: [AI接続設定]
 *     summary: プロバイダ一覧（admin）
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: プロバイダ一覧
 */
router.get('/', (req: Request, res: Response) => {
  const providers = db.prepare(`
    SELECT id, name, provider_type, endpoint, model, active, created_at
    FROM ai_providers
    ORDER BY created_at ASC
  `).all();
  return res.json(providers);
});

/**
 * @openapi
 * /ai/providers:
 *   post:
 *     tags: [AI接続設定]
 *     summary: プロバイダ追加（admin）
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, provider_type, endpoint]
 *             properties:
 *               name:          { type: string }
 *               provider_type: { type: string, enum: [ollama, openai, dify] }
 *               endpoint:      { type: string }
 *               api_key:       { type: string, nullable: true }
 *               model:         { type: string, nullable: true }
 *     responses:
 *       201:
 *         description: 追加成功
 */
router.post('/', (req: Request, res: Response) => {
  const { name, provider_type, endpoint, api_key, model } = req.body;

  if (!name || !provider_type || !endpoint) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'name / provider_type / endpoint は必須です' });
  }

  const validTypes = ['ollama', 'openai', 'dify'];
  if (!validTypes.includes(provider_type)) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'provider_type は ollama / openai / dify のいずれかです' });
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO ai_providers (id, name, provider_type, endpoint, api_key, model, active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, DATETIME('now'))
  `).run(id, name, provider_type, endpoint, api_key ?? null, model ?? null);

  const provider = db.prepare(`
    SELECT id, name, provider_type, endpoint, model, active, created_at FROM ai_providers WHERE id = ?
  `).get(id);
  return res.status(201).json(provider);
});

/**
 * @openapi
 * /ai/providers/{id}:
 *   put:
 *     tags: [AI接続設定]
 *     summary: プロバイダ更新（admin）
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: 更新成功
 *       404:
 *         description: 見つからない
 */
router.put('/:id', (req: Request, res: Response) => {
  const { name, provider_type, endpoint, api_key, model } = req.body;

  const provider = db.prepare('SELECT id FROM ai_providers WHERE id = ?').get(req.params.id);
  if (!provider) {
    return res.status(404).json({ error: 'PROVIDER_NOT_FOUND' });
  }

  if (provider_type) {
    const validTypes = ['ollama', 'openai', 'dify'];
    if (!validTypes.includes(provider_type)) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'provider_type は ollama / openai / dify のいずれかです' });
    }
  }

  const fields: string[] = [];
  const params: any[] = [];
  if (name !== undefined)          { fields.push('name = ?');          params.push(name); }
  if (provider_type !== undefined) { fields.push('provider_type = ?'); params.push(provider_type); }
  if (endpoint !== undefined)      { fields.push('endpoint = ?');      params.push(endpoint); }
  if (api_key !== undefined)       { fields.push('api_key = ?');       params.push(api_key); }
  if (model !== undefined)         { fields.push('model = ?');         params.push(model); }

  if (fields.length === 0) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: '更新するフィールドがありません' });
  }

  params.push(req.params.id);
  db.prepare(`UPDATE ai_providers SET ${fields.join(', ')} WHERE id = ?`).run(...params);

  const updated = db.prepare(`
    SELECT id, name, provider_type, endpoint, model, active, created_at FROM ai_providers WHERE id = ?
  `).get(req.params.id);
  return res.json(updated);
});

/**
 * @openapi
 * /ai/providers/{id}:
 *   delete:
 *     tags: [AI接続設定]
 *     summary: プロバイダ削除（admin）
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
router.delete('/:id', (req: Request, res: Response) => {
  const provider = db.prepare('SELECT id FROM ai_providers WHERE id = ?').get(req.params.id);
  if (!provider) {
    return res.status(404).json({ error: 'PROVIDER_NOT_FOUND' });
  }

  db.prepare('DELETE FROM ai_providers WHERE id = ?').run(req.params.id);
  return res.json({ message: 'プロバイダを削除しました' });
});

/**
 * @openapi
 * /ai/providers/{id}/activate:
 *   put:
 *     tags: [AI接続設定]
 *     summary: アクティブ切り替え（admin）他を自動で0にする
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: アクティブ切り替え成功
 *       404:
 *         description: 見つからない
 */
router.put('/:id/activate', (req: Request, res: Response) => {
  const provider = db.prepare('SELECT id FROM ai_providers WHERE id = ?').get(req.params.id);
  if (!provider) {
    return res.status(404).json({ error: 'PROVIDER_NOT_FOUND' });
  }

  // トランザクションで他を全て 0 にしてから対象を 1 に
  const activate = db.transaction(() => {
    db.prepare('UPDATE ai_providers SET active = 0').run();
    db.prepare('UPDATE ai_providers SET active = 1 WHERE id = ?').run(req.params.id);
  });
  activate();

  const updated = db.prepare(`
    SELECT id, name, provider_type, endpoint, model, active, created_at FROM ai_providers WHERE id = ?
  `).get(req.params.id);
  return res.json(updated);
});

export default router;
