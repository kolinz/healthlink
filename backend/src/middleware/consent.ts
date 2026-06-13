import { Request, Response, NextFunction } from 'express';
import db from '../db/client';

/**
 * 未同意患者へのアクセス制御ミドルウェア
 * - role=patient かつ consent_agreed=0 の場合に 403 を返す
 * - /auth/* と /consent パスはスキップする
 */
export function checkConsent(req: Request, res: Response, next: NextFunction): void {
  // /auth/* と /consent パスはスキップ
  if (req.path.startsWith('/auth') || req.path.startsWith('/consent')) {
    next();
    return;
  }

  // 未認証の場合はスキップ（authenticateToken で後続処理）
  if (!req.user) {
    next();
    return;
  }

  // patient 以外はスキップ
  if (req.user.role !== 'patient') {
    next();
    return;
  }

  // DBから最新の consent_agreed を確認
  const user = db.prepare('SELECT consent_agreed FROM users WHERE id = ?').get(req.user.userId) as any;

  if (!user || user.consent_agreed === 0) {
    res.status(403).json({
      error: 'CONSENT_REQUIRED',
      redirect: '/consent',
      message: '利用を開始するには同意が必要です',
    });
    return;
  }

  next();
}
