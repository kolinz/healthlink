import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import db from '../db/client';

/**
 * 外部連携APIキー認証ミドルウェア
 *
 * 1. X-API-Key ヘッダーを取得
 * 2. SHA-256 ハッシュを計算
 * 3. api_keys テーブルと照合（key_hash で検索）
 * 4. is_active=1 かつ（expires_at が NULL または未来）であることを確認
 * 5. 認証成功時: api_keys.last_used_at を DATETIME('now') に更新
 * 6. 認証失敗時: 401 { error: "INVALID_API_KEY" }
 */
export function authenticateApiKey(req: Request, res: Response, next: NextFunction): void {
  const rawKey = req.headers['x-api-key'] as string | undefined;

  if (!rawKey) {
    res.status(401).json({ error: 'INVALID_API_KEY', message: 'X-API-Key ヘッダーが必要です' });
    return;
  }

  // SHA-256 ハッシュを計算して DB と照合
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  const apiKey = db.prepare(`
    SELECT id, is_active, expires_at
    FROM api_keys
    WHERE key_hash = ?
  `).get(keyHash) as any;

  if (!apiKey) {
    res.status(401).json({ error: 'INVALID_API_KEY' });
    return;
  }

  // is_active チェック
  if (apiKey.is_active !== 1) {
    res.status(401).json({ error: 'INVALID_API_KEY', message: 'このAPIキーは失効しています' });
    return;
  }

  // expires_at チェック（NULL = 無期限）
  if (apiKey.expires_at !== null) {
    const expiresAt = new Date(apiKey.expires_at);
    if (expiresAt < new Date()) {
      res.status(401).json({ error: 'INVALID_API_KEY', message: 'このAPIキーは有効期限切れです' });
      return;
    }
  }

  // 認証成功: last_used_at を更新（監査・不正利用検知用）
  db.prepare(`
    UPDATE api_keys SET last_used_at = DATETIME('now') WHERE id = ?
  `).run(apiKey.id);

  next();
}
