import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/client';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { checkSameOrg } from '../services/orgAccess';
import { getActiveProvider, DifyProvider, ChatMessage } from '../services/aiProviders';

const router = Router();

router.use(authenticateToken);

// ============================================================
// システムプロンプトをDBから取得
// 未設定の場合はフォールバック文字列を使用
// ============================================================
function getSystemPrompt(topicLabel?: string): string {
  const row = db.prepare("SELECT value FROM system_settings WHERE key = 'system_prompt'").get() as any;
  let prompt = row?.value ?? 'あなたは相談者の健康状態をサポートするAIアシスタントです。\n医師の診断や処方の代替は禁止です。症状が重い場合は必ず医師への相談を促してください。';
  if (topicLabel) {
    prompt += `\n相談カテゴリ: ${topicLabel}`;
  }
  return prompt;
}

/**
 * @openapi
 * /ai/consultations:
 *   post:
 *     tags: [AI相談]
 *     summary: セッション開始（patient）
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               topic_id: { type: string, nullable: true }
 *     responses:
 *       201:
 *         description: セッション開始成功
 *       503:
 *         description: AIプロバイダ未設定
 */
router.post('/consultations', requireRole('patient'), (req: Request, res: Response) => {
  const { topic_id } = req.body ?? {};

  const providerRecord = db.prepare('SELECT id FROM ai_providers WHERE active = 1 LIMIT 1').get();
  if (!providerRecord) {
    return res.status(503).json({ error: 'AI_PROVIDER_UNAVAILABLE' });
  }

  if (topic_id) {
    const topic = db.prepare('SELECT id FROM consultation_topics WHERE id = ? AND is_active = 1').get(topic_id);
    if (!topic) {
      return res.status(404).json({ error: 'TOPIC_NOT_FOUND' });
    }
  }

  const id = uuidv4();
  const providerRec = providerRecord as any;

  db.prepare(`
    INSERT INTO ai_consultations (id, patient_id, ai_provider_id, topic_id, started_at)
    VALUES (?, ?, ?, ?, DATETIME('now'))
  `).run(id, req.user!.userId, providerRec.id, topic_id ?? null);

  const consultation = db.prepare('SELECT * FROM ai_consultations WHERE id = ?').get(id);
  return res.status(201).json(consultation);
});

/**
 * @openapi
 * /ai/consultations:
 *   get:
 *     tags: [AI相談]
 *     summary: 自分のセッション一覧（patient）
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: セッション一覧
 */
router.get('/consultations', requireRole('patient'), (req: Request, res: Response) => {
  const consultations = db.prepare(`
    SELECT ac.id, ac.patient_id, ac.ai_provider_id, ac.topic_id,
           ac.risk_level, ac.summary, ac.started_at,
           ct.label AS topic_label,
           (SELECT COUNT(*) FROM ai_messages am WHERE am.consultation_id = ac.id) AS message_count
    FROM ai_consultations ac
    LEFT JOIN consultation_topics ct ON ct.id = ac.topic_id
    WHERE ac.patient_id = ?
    ORDER BY ac.started_at DESC
  `).all(req.user!.userId);

  return res.json(consultations);
});

/**
 * @openapi
 * /ai/consultations/{id}:
 *   get:
 *     tags: [AI相談]
 *     summary: セッション詳細＋メッセージ
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: セッション詳細
 */
router.get('/consultations/:id', (req: Request, res: Response) => {
  const consultation = db.prepare('SELECT * FROM ai_consultations WHERE id = ?').get(req.params.id) as any;
  if (!consultation) {
    return res.status(404).json({ error: 'CONSULTATION_NOT_FOUND' });
  }

  const { role, userId } = req.user!;

  if (role === 'patient') {
    if (consultation.patient_id !== userId) {
      return res.status(403).json({ error: 'FORBIDDEN' });
    }
  } else if (role === 'doctor' || role === 'nurse') {
    const patient = db.prepare('SELECT consent_agreed FROM users WHERE id = ?').get(consultation.patient_id) as any;
    if (!patient || patient.consent_agreed === 0) {
      return res.status(403).json({ error: 'CONSENT_REQUIRED' });
    }
    if (!checkSameOrg(userId, consultation.patient_id)) {
      return res.status(403).json({ error: 'FORBIDDEN' });
    }
  } else {
    return res.status(403).json({ error: 'FORBIDDEN' });
  }

  const messages = db.prepare(`
    SELECT * FROM ai_messages WHERE consultation_id = ? ORDER BY created_at ASC
  `).all(req.params.id);

  return res.json({ ...consultation, messages });
});

/**
 * @openapi
 * /ai/consultations/{id}/messages:
 *   post:
 *     tags: [AI相談]
 *     summary: メッセージ送信（SSEストリーミング）（patient）
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
 *             required: [content]
 *             properties:
 *               content: { type: string }
 *     responses:
 *       200:
 *         description: SSEストリーム
 */
router.post('/consultations/:id/messages', requireRole('patient'), async (req: Request, res: Response) => {
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'content は必須です' });
  }

  const consultation = db.prepare('SELECT * FROM ai_consultations WHERE id = ?').get(req.params.id) as any;
  if (!consultation) {
    return res.status(404).json({ error: 'CONSULTATION_NOT_FOUND' });
  }

  if (consultation.patient_id !== req.user!.userId) {
    return res.status(403).json({ error: 'FORBIDDEN' });
  }

  let providerInfo: ReturnType<typeof getActiveProvider>;
  try {
    providerInfo = getActiveProvider();
  } catch {
    return res.status(503).json({ error: 'AI_PROVIDER_UNAVAILABLE' });
  }

  // ユーザーメッセージを保存
  const userMsgId = uuidv4();
  db.prepare(`
    INSERT INTO ai_messages (id, consultation_id, role, content, created_at)
    VALUES (?, ?, 'user', ?, DATETIME('now'))
  `).run(userMsgId, req.params.id, content);

  // 過去メッセージを取得
  const history = db.prepare(`
    SELECT role, content FROM ai_messages
    WHERE consultation_id = ?
    ORDER BY created_at ASC
  `).all(req.params.id) as ChatMessage[];

  // トピックラベルを取得
  const topic = consultation.topic_id
    ? db.prepare('SELECT label FROM consultation_topics WHERE id = ?').get(consultation.topic_id) as any
    : null;

  // DBからシステムプロンプトを取得
  const systemPrompt = getSystemPrompt(topic?.label);

  // SSEヘッダー設定
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  let fullContent = '';

  try {
    if (providerInfo.record.provider_type === 'dify') {
      const difyProvider = providerInfo.provider as DifyProvider;
      let newConversationId: string | undefined;

      for await (const chunk of difyProvider.stream(
        history,
        systemPrompt,
        consultation.dify_conversation_id ?? undefined,
        (id: string) => { newConversationId = id; },
      )) {
        fullContent += chunk;
        res.write(`data: ${JSON.stringify({ delta: chunk })}\n\n`);
      }

      if (newConversationId && !consultation.dify_conversation_id) {
        db.prepare('UPDATE ai_consultations SET dify_conversation_id = ? WHERE id = ?')
          .run(newConversationId, req.params.id);
      }
    } else {
      for await (const chunk of providerInfo.provider.stream(history, systemPrompt)) {
        fullContent += chunk;
        res.write(`data: ${JSON.stringify({ delta: chunk })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();

    // ストリーム完了後に全文保存
    const assistantMsgId = uuidv4();
    db.prepare(`
      INSERT INTO ai_messages (id, consultation_id, role, content, created_at)
      VALUES (?, ?, 'assistant', ?, DATETIME('now'))
    `).run(assistantMsgId, req.params.id, fullContent);

  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: 'STREAM_ERROR' })}\n\n`);
    res.end();
  }
});

/**
 * @openapi
 * /ai/consultations/{id}/summarize:
 *   post:
 *     tags: [AI相談]
 *     summary: 要約・危険度生成（doctor / nurse）
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: 要約・危険度生成成功
 */
router.post('/consultations/:id/summarize', requireRole('doctor', 'nurse'), async (req: Request, res: Response) => {
  const consultation = db.prepare('SELECT * FROM ai_consultations WHERE id = ?').get(req.params.id) as any;
  if (!consultation) {
    return res.status(404).json({ error: 'CONSULTATION_NOT_FOUND' });
  }

  const patient = db.prepare('SELECT consent_agreed FROM users WHERE id = ?').get(consultation.patient_id) as any;
  if (!patient || patient.consent_agreed === 0) {
    return res.status(403).json({ error: 'CONSENT_REQUIRED' });
  }

  if (!checkSameOrg(req.user!.userId, consultation.patient_id)) {
    return res.status(403).json({ error: 'FORBIDDEN' });
  }

  let providerInfo: ReturnType<typeof getActiveProvider>;
  try {
    providerInfo = getActiveProvider();
  } catch {
    return res.status(503).json({ error: 'AI_PROVIDER_UNAVAILABLE' });
  }

  const messages = db.prepare(`
    SELECT role, content FROM ai_messages
    WHERE consultation_id = ? ORDER BY created_at ASC
  `).all(req.params.id) as ChatMessage[];

  if (messages.length === 0) {
    return res.status(400).json({ error: 'NO_MESSAGES', message: 'メッセージがありません' });
  }

  const summarizePrompt = `以下の相談者とAIの会話を要約し、リスクレベルを評価してください。
リスクレベルは low / medium / high のいずれかで判定してください。
以下のJSON形式のみで回答してください:
{"summary": "要約文", "risk_level": "low|medium|high"}`;

  try {
    const result = await providerInfo.provider.chat(messages, summarizePrompt);
    const clean = result.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean) as { summary: string; risk_level: string };

    const validRiskLevels = ['low', 'medium', 'high'];
    const riskLevel = validRiskLevels.includes(parsed.risk_level) ? parsed.risk_level : 'low';

    db.prepare(`
      UPDATE ai_consultations SET summary = ?, risk_level = ? WHERE id = ?
    `).run(parsed.summary, riskLevel, req.params.id);

    return res.json({ summary: parsed.summary, risk_level: riskLevel });
  } catch {
    return res.status(500).json({ error: 'SUMMARIZE_FAILED', message: '要約の生成に失敗しました' });
  }
});

export default router;
