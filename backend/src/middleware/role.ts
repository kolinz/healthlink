import { Request, Response, NextFunction } from 'express';
import type { Role } from '../types/index';

/**
 * ロールベースのアクセス制御ミドルウェア
 * 指定したロールのいずれかに一致しない場合は 403 を返す
 * 使用例: router.use(authenticateToken, requireRole('admin'))
 *         router.get('/path', authenticateToken, requireRole('doctor', 'nurse'), handler)
 */
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: '認証が必要です' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: 'FORBIDDEN',
        message: 'このリソースへのアクセス権限がありません',
      });
      return;
    }

    next();
  };
}
