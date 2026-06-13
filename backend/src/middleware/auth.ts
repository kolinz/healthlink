import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from '../types/index';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? 'access_secret';

/**
 * JWT アクセストークンを検証し、req.user にデコード済みペイロードをセットする
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

  if (!token) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'アクセストークンが必要です' });
    return;
  }

  try {
    const decoded = jwt.verify(token, ACCESS_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'INVALID_TOKEN', message: 'アクセストークンが無効または期限切れです' });
  }
}
