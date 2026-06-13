import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/client';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/role';

const router = Router();

// 1インスタンス = 1施設運用のため、通常organizationsレコードは1件。
// ただし将来の拡張（部門分け等）に備えてAPIは複数対応で実装する。
// doctor/nurse のアクセス範囲は user_organizations テーブルの組織所属で制御される。
// この判定は /patients・/daily-logs・/ai/consultations の各エンドポイントで行う。

// 全エンドポイントに JWT 認証 + admin 権限チェックを適用
router.use(authenticateToken, requireRole('admin'));

/**
 * @openapi
 * /organizations:
 *   get:
 *     tags: [組織管理]
 *     summary: 組織一覧
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 組織一覧
 */
router.get('/', (req: Request, res: Response) => {
  const organizations = db.prepare(`
    SELECT id, name, code, is_active, created_at
    FROM organizations
    ORDER BY created_at ASC
  `).all();
  return res.json(organizations);
});

/**
 * @openapi
 * /organizations:
 *   post:
 *     tags: [組織管理]
 *     summary: 組織作成
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
 *               name: { type: string }
 *               code: { type: string }
 *     responses:
 *       201:
 *         description: 作成成功
 *       409:
 *         description: コード重複
 */
router.post('/', (req: Request, res: Response) => {
  const { name, code } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'name は必須です' });
  }

  if (code) {
    const existing = db.prepare('SELECT id FROM organizations WHERE code = ?').get(code);
    if (existing) {
      return res.status(409).json({ error: 'CODE_TAKEN', message: 'この施設コードは既に使用されています' });
    }
  }

  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO organizations (id, name, code, is_active, created_at)
    VALUES (?, ?, ?, 1, ?)
  `).run(id, name, code ?? null, now);

  const organization = db.prepare('SELECT * FROM organizations WHERE id = ?').get(id);
  return res.status(201).json(organization);
});

/**
 * @openapi
 * /organizations/{id}:
 *   get:
 *     tags: [組織管理]
 *     summary: 組織詳細
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: 組織詳細
 *       404:
 *         description: 見つからない
 */
router.get('/:id', (req: Request, res: Response) => {
  const organization = db.prepare('SELECT * FROM organizations WHERE id = ?').get(req.params.id);
  if (!organization) {
    return res.status(404).json({ error: 'ORGANIZATION_NOT_FOUND' });
  }
  return res.json(organization);
});

/**
 * @openapi
 * /organizations/{id}:
 *   put:
 *     tags: [組織管理]
 *     summary: 組織更新
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
 *               name:      { type: string }
 *               code:      { type: string }
 *               is_active: { type: integer, enum: [0, 1] }
 *     responses:
 *       200:
 *         description: 更新成功
 *       404:
 *         description: 見つからない
 */
router.put('/:id', (req: Request, res: Response) => {
  const { name, code, is_active } = req.body;

  const organization = db.prepare('SELECT id FROM organizations WHERE id = ?').get(req.params.id);
  if (!organization) {
    return res.status(404).json({ error: 'ORGANIZATION_NOT_FOUND' });
  }

  if (code) {
    const existing = db.prepare('SELECT id FROM organizations WHERE code = ? AND id != ?').get(code, req.params.id);
    if (existing) {
      return res.status(409).json({ error: 'CODE_TAKEN', message: 'この施設コードは既に使用されています' });
    }
  }

  const fields: string[] = [];
  const params: any[] = [];
  if (name !== undefined)      { fields.push('name = ?');      params.push(name); }
  if (code !== undefined)      { fields.push('code = ?');      params.push(code); }
  if (is_active !== undefined) { fields.push('is_active = ?'); params.push(Number(is_active)); }

  if (fields.length === 0) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: '更新するフィールドがありません' });
  }

  params.push(req.params.id);
  db.prepare(`UPDATE organizations SET ${fields.join(', ')} WHERE id = ?`).run(...params);

  const updated = db.prepare('SELECT * FROM organizations WHERE id = ?').get(req.params.id);
  return res.json(updated);
});

/**
 * @openapi
 * /organizations/{id}:
 *   delete:
 *     tags: [組織管理]
 *     summary: 組織削除
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
  const organization = db.prepare('SELECT id FROM organizations WHERE id = ?').get(req.params.id);
  if (!organization) {
    return res.status(404).json({ error: 'ORGANIZATION_NOT_FOUND' });
  }

  db.prepare('DELETE FROM organizations WHERE id = ?').run(req.params.id);
  return res.json({ message: '組織を削除しました' });
});

/**
 * @openapi
 * /organizations/{id}/members:
 *   get:
 *     tags: [組織管理]
 *     summary: 組織メンバー一覧
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: メンバー一覧
 *       404:
 *         description: 組織が見つからない
 */
router.get('/:id/members', (req: Request, res: Response) => {
  const organization = db.prepare('SELECT id FROM organizations WHERE id = ?').get(req.params.id);
  if (!organization) {
    return res.status(404).json({ error: 'ORGANIZATION_NOT_FOUND' });
  }

  const members = db.prepare(`
    SELECT uo.id AS membership_id, uo.assigned_at,
           u.id, u.username, u.role, u.is_active,
           p.name, p.email
    FROM user_organizations uo
    JOIN users u ON u.id = uo.user_id
    LEFT JOIN profiles p ON p.user_id = u.id
    WHERE uo.organization_id = ?
    ORDER BY uo.assigned_at ASC
  `).all(req.params.id);

  return res.json(members);
});

/**
 * @openapi
 * /organizations/{id}/members:
 *   post:
 *     tags: [組織管理]
 *     summary: メンバー追加
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
 *             required: [user_id]
 *             properties:
 *               user_id: { type: string }
 *     responses:
 *       201:
 *         description: メンバー追加成功
 *       409:
 *         description: 既にメンバー
 */
router.post('/:id/members', (req: Request, res: Response) => {
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'user_id は必須です' });
  }

  const organization = db.prepare('SELECT id FROM organizations WHERE id = ?').get(req.params.id);
  if (!organization) {
    return res.status(404).json({ error: 'ORGANIZATION_NOT_FOUND' });
  }

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(user_id);
  if (!user) {
    return res.status(404).json({ error: 'USER_NOT_FOUND' });
  }

  const existing = db.prepare(
    'SELECT id FROM user_organizations WHERE user_id = ? AND organization_id = ?'
  ).get(user_id, req.params.id);
  if (existing) {
    return res.status(409).json({ error: 'ALREADY_MEMBER', message: '既にメンバーです' });
  }

  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO user_organizations (id, user_id, organization_id, assigned_at)
    VALUES (?, ?, ?, ?)
  `).run(id, user_id, req.params.id, now);

  return res.status(201).json({ id, user_id, organization_id: req.params.id, assigned_at: now });
});

/**
 * @openapi
 * /organizations/{id}/members/{userId}:
 *   delete:
 *     tags: [組織管理]
 *     summary: メンバー削除
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: メンバー削除成功
 *       404:
 *         description: 見つからない
 */
router.delete('/:id/members/:userId', (req: Request, res: Response) => {
  const membership = db.prepare(
    'SELECT id FROM user_organizations WHERE user_id = ? AND organization_id = ?'
  ).get(req.params.userId, req.params.id);

  if (!membership) {
    return res.status(404).json({ error: 'MEMBER_NOT_FOUND' });
  }

  db.prepare(
    'DELETE FROM user_organizations WHERE user_id = ? AND organization_id = ?'
  ).run(req.params.userId, req.params.id);

  return res.json({ message: 'メンバーを削除しました' });
});

export default router;
