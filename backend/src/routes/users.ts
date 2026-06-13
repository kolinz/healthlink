import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/client';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/role';

const router = Router();

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS ?? '10', 10);

router.use(authenticateToken, requireRole('admin'));

/**
 * @openapi
 * /users:
 *   get:
 *     tags: [ユーザー管理]
 *     summary: ユーザー一覧・検索
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [patient, doctor, nurse, admin] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: is_active
 *         schema: { type: integer, enum: [0, 1] }
 *     responses:
 *       200:
 *         description: ユーザー一覧
 */
router.get('/', (req: Request, res: Response) => {
  const { role, search, is_active } = req.query;

  let query = `
    SELECT u.id, u.username, u.role, u.is_active,
           u.consent_agreed, u.consent_agreed_at, u.consent_version, u.consent_withdrawn_at,
           u.created_at,
           p.name, p.email, p.position, p.preferred_communication
    FROM users u
    LEFT JOIN profiles p ON p.user_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (role)      { query += ' AND u.role = ?';                              params.push(role); }
  if (search)    { query += ' AND (u.username LIKE ? OR p.name LIKE ?)';   params.push(`%${search}%`, `%${search}%`); }
  if (is_active !== undefined) { query += ' AND u.is_active = ?';           params.push(Number(is_active)); }

  query += ' ORDER BY u.created_at DESC';

  const users = db.prepare(query).all(...params);
  return res.json(users);
});

/**
 * @openapi
 * /users:
 *   post:
 *     tags: [ユーザー管理]
 *     summary: ユーザー作成
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password, role]
 *             properties:
 *               username: { type: string }
 *               password: { type: string }
 *               role:     { type: string, enum: [patient, doctor, nurse, admin] }
 *               name:     { type: string }
 *               email:    { type: string }
 *               position: { type: string }
 *               preferred_communication: { type: string, enum: [email, chat, in_person] }
 *     responses:
 *       201:
 *         description: 作成成功
 */
router.post('/', (req: Request, res: Response) => {
  const { username, password, role, name, email, position, preferred_communication } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'username / password / role は必須です' });
  }

  const validRoles = ['patient', 'doctor', 'nurse', 'admin'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: '無効なロールです' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(409).json({ error: 'USERNAME_TAKEN', message: 'このユーザー名は既に使用されています' });
  }

  const userId    = uuidv4();
  const profileId = uuidv4();
  const passwordHash = bcrypt.hashSync(password, BCRYPT_ROUNDS);
  const now = new Date().toISOString();

  const insertBoth = db.transaction(() => {
    db.prepare(`
      INSERT INTO users (id, username, password_hash, role, is_active, consent_agreed, created_at)
      VALUES (@id, @username, @password_hash, @role, 1, 0, @created_at)
    `).run({ id: userId, username, password_hash: passwordHash, role, created_at: now });

    db.prepare(`
      INSERT INTO profiles (id, user_id, name, email, position, preferred_communication, created_at)
      VALUES (@id, @user_id, @name, @email, @position, @preferred_communication, @created_at)
    `).run({
      id: profileId, user_id: userId,
      name: name ?? null, email: email ?? null,
      position: position ?? null,
      preferred_communication: preferred_communication ?? null,
      created_at: now,
    });
  });

  insertBoth();

  const user = db.prepare(`
    SELECT u.id, u.username, u.role, u.is_active, u.consent_agreed, u.created_at,
           p.name, p.email, p.position, p.preferred_communication
    FROM users u LEFT JOIN profiles p ON p.user_id = u.id
    WHERE u.id = ?
  `).get(userId);

  return res.status(201).json(user);
});

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     tags: [ユーザー管理]
 *     summary: ユーザー詳細
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: ユーザー詳細
 */
router.get('/:id', (req: Request, res: Response) => {
  const user = db.prepare(`
    SELECT u.id, u.username, u.role, u.is_active,
           u.consent_agreed, u.consent_agreed_at, u.consent_version, u.consent_withdrawn_at,
           u.created_at,
           p.name, p.email, p.position, p.preferred_communication
    FROM users u
    LEFT JOIN profiles p ON p.user_id = u.id
    WHERE u.id = ?
  `).get(req.params.id);

  if (!user) return res.status(404).json({ error: 'USER_NOT_FOUND' });
  return res.json(user);
});

/**
 * @openapi
 * /users/{id}:
 *   put:
 *     tags: [ユーザー管理]
 *     summary: ユーザー更新
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
 */
router.put('/:id', (req: Request, res: Response) => {
  const { role, is_active, name, email, position, preferred_communication } = req.body;

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'USER_NOT_FOUND' });

  const updateUser = db.transaction(() => {
    if (role !== undefined || is_active !== undefined) {
      const fields: string[] = [];
      const params: any[] = [];
      if (role !== undefined)      { fields.push('role = ?');      params.push(role); }
      if (is_active !== undefined) { fields.push('is_active = ?'); params.push(Number(is_active)); }
      params.push(req.params.id);
      db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    }

    if (name !== undefined || email !== undefined || position !== undefined || preferred_communication !== undefined) {
      const existing = db.prepare('SELECT id FROM profiles WHERE user_id = ?').get(req.params.id) as any;
      const now = new Date().toISOString();

      if (existing) {
        const fields: string[] = [];
        const params: any[] = [];
        if (name !== undefined)                    { fields.push('name = ?');                   params.push(name); }
        if (email !== undefined)                   { fields.push('email = ?');                  params.push(email); }
        if (position !== undefined)                { fields.push('position = ?');               params.push(position); }
        if (preferred_communication !== undefined) { fields.push('preferred_communication = ?'); params.push(preferred_communication); }
        fields.push('updated_at = ?');
        params.push(now);
        params.push(req.params.id);
        db.prepare(`UPDATE profiles SET ${fields.join(', ')} WHERE user_id = ?`).run(...params);
      } else {
        db.prepare(`
          INSERT INTO profiles (id, user_id, name, email, position, preferred_communication, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(uuidv4(), req.params.id, name ?? null, email ?? null, position ?? null, preferred_communication ?? null, now);
      }
    }
  });

  updateUser();

  const updated = db.prepare(`
    SELECT u.id, u.username, u.role, u.is_active,
           u.consent_agreed, u.consent_agreed_at, u.consent_version, u.created_at,
           p.name, p.email, p.position, p.preferred_communication
    FROM users u LEFT JOIN profiles p ON p.user_id = u.id
    WHERE u.id = ?
  `).get(req.params.id);

  return res.json(updated);
});

/**
 * @openapi
 * /users/{id}/reset-password:
 *   post:
 *     tags: [ユーザー管理]
 *     summary: パスワード再設定
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: パスワード再設定完了
 */
router.post('/:id/reset-password', (req: Request, res: Response) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'password は必須です' });

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'USER_NOT_FOUND' });

  const passwordHash = bcrypt.hashSync(password, BCRYPT_ROUNDS);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, req.params.id);

  return res.json({ message: 'パスワードを再設定しました' });
});

export default router;
