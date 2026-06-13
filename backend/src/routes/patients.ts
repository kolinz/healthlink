import { Router, Request, Response } from 'express';
import db from '../db/client';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { checkSameOrg } from '../services/orgAccess';

const router = Router();

router.use(authenticateToken, requireRole('doctor', 'nurse'));

/**
 * @openapi
 * /patients:
 *   get:
 *     tags: [患者モニタリング]
 *     summary: 同一組織の患者一覧（doctor / nurse）
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 患者一覧
 */
router.get('/', (req: Request, res: Response) => {
  const patients = db.prepare(`
    SELECT
      u.id, u.username, u.role, u.is_active,
      u.consent_agreed, u.created_at,
      p.name, p.email, p.position, p.preferred_communication,
      o.name AS organization_name,
      (
        SELECT dl.status FROM daily_logs dl
        WHERE dl.patient_id = u.id
        ORDER BY dl.logged_at DESC LIMIT 1
      ) AS latest_status,
      (
        SELECT dl.logged_at FROM daily_logs dl
        WHERE dl.patient_id = u.id
        ORDER BY dl.logged_at DESC LIMIT 1
      ) AS last_logged_at,
      (
        SELECT ac.risk_level FROM ai_consultations ac
        WHERE ac.patient_id = u.id
        ORDER BY ac.started_at DESC LIMIT 1
      ) AS latest_risk_level
    FROM users u
    INNER JOIN user_organizations uo ON uo.user_id = u.id
    INNER JOIN organizations o ON o.id = uo.organization_id
    LEFT JOIN profiles p ON p.user_id = u.id
    WHERE u.role = 'patient'
      AND u.is_active = 1
      AND u.consent_agreed = 1
      AND uo.organization_id IN (
        SELECT organization_id FROM user_organizations WHERE user_id = ?
      )
    ORDER BY last_logged_at DESC NULLS LAST
  `).all(req.user!.userId);

  return res.json(patients);
});

/**
 * @openapi
 * /patients/{id}:
 *   get:
 *     tags: [患者モニタリング]
 *     summary: 患者詳細（doctor / nurse）
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: 患者詳細
 */
router.get('/:id', (req: Request, res: Response) => {
  const patient = db.prepare(`
    SELECT
      u.id, u.username, u.role, u.is_active,
      u.consent_agreed, u.created_at,
      p.name, p.email, p.position, p.preferred_communication,
      o.name AS organization_name,
      (
        SELECT ac.risk_level FROM ai_consultations ac
        WHERE ac.patient_id = u.id
        ORDER BY ac.started_at DESC LIMIT 1
      ) AS latest_risk_level
    FROM users u
    INNER JOIN user_organizations uo ON uo.user_id = u.id
    INNER JOIN organizations o ON o.id = uo.organization_id
    LEFT JOIN profiles p ON p.user_id = u.id
    WHERE u.id = ?
      AND u.consent_agreed = 1
    LIMIT 1
  `).get(req.params.id);

  if (!patient) {
    return res.status(404).json({ error: 'PATIENT_NOT_FOUND' });
  }

  if (!checkSameOrg(req.user!.userId, req.params.id)) {
    return res.status(403).json({ error: 'FORBIDDEN' });
  }

  return res.json(patient);
});

/**
 * @openapi
 * /patients/{id}/daily-logs:
 *   get:
 *     tags: [患者モニタリング]
 *     summary: 患者の体調ログ一覧（doctor / nurse）
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: 体調ログ一覧
 */
router.get('/:id/daily-logs', (req: Request, res: Response) => {
  const patient = db.prepare('SELECT consent_agreed FROM users WHERE id = ?').get(req.params.id) as any;
  if (!patient || patient.consent_agreed === 0) {
    return res.status(403).json({ error: 'CONSENT_REQUIRED' });
  }

  if (!checkSameOrg(req.user!.userId, req.params.id)) {
    return res.status(403).json({ error: 'FORBIDDEN' });
  }

  const logs = db.prepare(`
    SELECT * FROM daily_logs
    WHERE patient_id = ?
    ORDER BY logged_at DESC
  `).all(req.params.id);

  return res.json(logs);
});

/**
 * @openapi
 * /patients/{id}/consultations:
 *   get:
 *     tags: [患者モニタリング]
 *     summary: 患者のAI相談履歴一覧（doctor / nurse）
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: AI相談履歴一覧
 */
router.get('/:id/consultations', (req: Request, res: Response) => {
  const patient = db.prepare('SELECT consent_agreed FROM users WHERE id = ?').get(req.params.id) as any;
  if (!patient || patient.consent_agreed === 0) {
    return res.status(403).json({ error: 'CONSENT_REQUIRED' });
  }

  if (!checkSameOrg(req.user!.userId, req.params.id)) {
    return res.status(403).json({ error: 'FORBIDDEN' });
  }

  const consultations = db.prepare(`
    SELECT
      ac.id, ac.patient_id, ac.topic_id,
      ac.risk_level, ac.summary, ac.started_at,
      ct.label AS topic_label,
      (SELECT COUNT(*) FROM ai_messages am WHERE am.consultation_id = ac.id) AS message_count
    FROM ai_consultations ac
    LEFT JOIN consultation_topics ct ON ct.id = ac.topic_id
    WHERE ac.patient_id = ?
    ORDER BY ac.started_at DESC
  `).all(req.params.id);

  return res.json(consultations);
});

export default router;
