import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/client';
import { authenticateToken } from '../middleware/auth';
import type { JwtPayload } from '../types/index';

const router = Router();

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS ?? '10', 10);
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? 'access_secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'refresh_secret';
const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN ?? '15m';
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN ?? '7d';

// アクセストークン生成
function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES_IN } as jwt.SignOptions);
}

// リフレッシュトークン生成・DB保存
function generateRefreshToken(userId: string): string {
  const token = jwt.sign({ userId }, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN } as jwt.SignOptions);
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  db.prepare(`
    INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, revoked, created_at)
    VALUES (@id, @user_id, @token_hash, @expires_at, 0, DATETIME('now'))
  `).run({ id: uuidv4(), user_id: userId, token_hash: tokenHash, expires_at: expiresAt.toISOString() });

  return token;
}

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [認証]
 *     summary: 患者セルフ登録
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password, consent_agreed, consent_version]
 *             properties:
 *               username:               { type: string }
 *               email:                  { type: string }
 *               password:               { type: string }
 *               name:                   { type: string }
 *               position:               { type: string }
 *               preferred_communication:
 *                 type: string
 *                 enum: [email, chat, in_person]
 *               consent_agreed:         { type: boolean }
 *               consent_version:        { type: string }
 *     responses:
 *       201:
 *         description: 登録成功
 *       400:
 *         description: バリデーションエラー
 *       409:
 *         description: ユーザー名重複
 */
router.post('/register', (req: Request, res: Response) => {
  const {
    username, email, password,
    name, position, preferred_communication,
    consent_agreed, consent_version,
  } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'username と password は必須です' });
  }
  if (!consent_agreed) {
    return res.status(400).json({ error: 'CONSENT_REQUIRED', message: '同意が必要です' });
  }
  if (!consent_version) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'consent_version は必須です' });
  }

  // ユーザー名重複チェック
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(409).json({ error: 'USERNAME_TAKEN', message: 'このユーザー名は既に使用されています' });
  }

  const userId = uuidv4();
  const profileId = uuidv4();
  const passwordHash = bcrypt.hashSync(password, BCRYPT_ROUNDS);
  const now = new Date().toISOString();

  // トランザクションで users + profiles を同時に INSERT
  const insertBoth = db.transaction(() => {
    db.prepare(`
      INSERT INTO users (id, username, password_hash, role, is_active, consent_agreed, consent_agreed_at, consent_version, created_at)
      VALUES (@id, @username, @password_hash, 'patient', 1, 1, @consent_agreed_at, @consent_version, @created_at)
    `).run({ id: userId, username, password_hash: passwordHash, consent_agreed_at: now, consent_version, created_at: now });

    db.prepare(`
      INSERT INTO profiles (id, user_id, name, email, position, preferred_communication, created_at)
      VALUES (@id, @user_id, @name, @email, @position, @preferred_communication, @created_at)
    `).run({ id: profileId, user_id: userId, name: name ?? null, email: email ?? null, position: position ?? null, preferred_communication: preferred_communication ?? null, created_at: now });
  });

  insertBoth();

  const accessToken = generateAccessToken({ userId, role: 'patient' });
  const refreshToken = generateRefreshToken(userId);

  return res.status(201).json({ accessToken, refreshToken });
});

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [認証]
 *     summary: ログイン
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: ログイン成功
 *       401:
 *         description: 認証失敗
 */
router.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'username と password は必須です' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'ユーザー名またはパスワードが正しくありません' });
  }

  if (!user.is_active) {
    return res.status(403).json({ error: 'ACCOUNT_DISABLED', message: 'このアカウントは無効です' });
  }

  const accessToken = generateAccessToken({ userId: user.id, role: user.role });
  const refreshToken = generateRefreshToken(user.id);

  return res.json({
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      consent_agreed: user.consent_agreed,
    },
  });
});

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [認証]
 *     summary: ログアウト（リフレッシュトークン無効化）
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: ログアウト成功
 */
router.post('/logout', authenticateToken, (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (refreshToken) {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE token_hash = ?').run(tokenHash);
  }

  return res.json({ message: 'ログアウトしました' });
});

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [認証]
 *     summary: アクセストークン再発行
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: 再発行成功
 *       401:
 *         description: 無効なリフレッシュトークン
 */
router.post('/refresh', (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ error: 'REFRESH_TOKEN_REQUIRED' });
  }

  let decoded: any;
  try {
    decoded = jwt.verify(refreshToken, REFRESH_SECRET);
  } catch {
    return res.status(401).json({ error: 'INVALID_REFRESH_TOKEN' });
  }

  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const stored = db.prepare(`
    SELECT * FROM refresh_tokens
    WHERE token_hash = ? AND revoked = 0 AND expires_at > DATETIME('now')
  `).get(tokenHash) as any;

  if (!stored) {
    return res.status(401).json({ error: 'INVALID_REFRESH_TOKEN' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.userId) as any;
  if (!user || !user.is_active) {
    return res.status(401).json({ error: 'USER_NOT_FOUND' });
  }

  const accessToken = generateAccessToken({ userId: user.id, role: user.role });
  return res.json({ accessToken });
});

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [認証]
 *     summary: ログイン中ユーザー情報取得
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ユーザー情報
 *       401:
 *         description: 未認証
 */
router.get('/me', authenticateToken, (req: Request, res: Response) => {
  const user = db.prepare(`
    SELECT u.id, u.username, u.role, u.is_active,
           u.consent_agreed, u.consent_agreed_at, u.consent_version, u.consent_withdrawn_at,
           u.created_at,
           p.name, p.email, p.position, p.preferred_communication
    FROM users u
    LEFT JOIN profiles p ON p.user_id = u.id
    WHERE u.id = ?
  `).get(req.user!.userId) as any;

  if (!user) {
    return res.status(404).json({ error: 'USER_NOT_FOUND' });
  }

  return res.json(user);
});

/**
 * @openapi
 * /auth/consent:
 *   post:
 *     tags: [認証]
 *     summary: 初回同意記録（admin作成ユーザー用）
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [consent_agreed, consent_version]
 *             properties:
 *               consent_agreed:  { type: boolean }
 *               consent_version: { type: string }
 *     responses:
 *       200:
 *         description: 同意記録完了
 *       400:
 *         description: バリデーションエラー
 */
router.post('/consent', authenticateToken, (req: Request, res: Response) => {
  const { consent_agreed, consent_version } = req.body;

  if (!consent_agreed) {
    return res.status(400).json({ error: 'CONSENT_REQUIRED', message: '全項目への同意が必要です' });
  }
  if (!consent_version) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'consent_version は必須です' });
  }

  db.prepare(`
    UPDATE users
    SET consent_agreed = 1, consent_agreed_at = DATETIME('now'), consent_version = ?
    WHERE id = ?
  `).run(consent_version, req.user!.userId);

  return res.json({ message: '同意を記録しました' });
});

/**
 * @openapi
 * /auth/consent:
 *   delete:
 *     tags: [認証]
 *     summary: 同意撤回
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 同意撤回完了
 */
router.delete('/consent', authenticateToken, (req: Request, res: Response) => {
  // 同意撤回: consent_agreed=0 + consent_withdrawn_at を記録（倫理審査の証跡）
  db.prepare(`
    UPDATE users
    SET consent_agreed = 0, consent_withdrawn_at = DATETIME('now')
    WHERE id = ?
  `).run(req.user!.userId);

  return res.json({ message: '同意を撤回しました。医療者からのアクセスは即時停止されます。' });
});

export default router;
