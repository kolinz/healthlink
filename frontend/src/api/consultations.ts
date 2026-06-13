import apiClient from './client';

// ============================================================
// 型定義
// ============================================================

export type RiskLevel = 'low' | 'medium' | 'high';

export interface ConsultationTopic {
  id: string;
  label: string;
  icon: string;
  sort_order: number;
  is_active: number;
  created_at: string;
}

export interface Consultation {
  id: string;
  patient_id: string;
  ai_provider_id: string;
  topic_id: string | null;
  topic_label: string | null;
  dify_conversation_id: string | null;
  risk_level: RiskLevel | null;
  summary: string | null;
  started_at: string;
  message_count?: number;
}

export interface ConsultationMessage {
  id: string;
  consultation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface ConsultationDetail extends Consultation {
  messages: ConsultationMessage[];
}

export interface SummarizeResult {
  summary: string;
  risk_level: RiskLevel;
}

// ============================================================
// 相談トピック
// ============================================================

/**
 * トピック一覧取得（is_active=1のみ・全員）
 */
export async function getTopics(): Promise<ConsultationTopic[]> {
  const res = await apiClient.get<ConsultationTopic[]>('/consultation-topics');
  return res.data;
}

// ============================================================
// AI相談セッション（patient向け）
// ============================================================

/**
 * セッション開始
 */
export async function startConsultation(topicId?: string): Promise<Consultation> {
  const res = await apiClient.post<Consultation>('/ai/consultations', {
    topic_id: topicId ?? null,
  });
  return res.data;
}

/**
 * 自分のセッション一覧取得（patient）
 */
export async function getConsultations(): Promise<Consultation[]> {
  const res = await apiClient.get<Consultation[]>('/ai/consultations');
  return res.data;
}

/**
 * セッション詳細＋メッセージ取得
 */
export async function getConsultation(id: string): Promise<ConsultationDetail> {
  const res = await apiClient.get<ConsultationDetail>(`/ai/consultations/${id}`);
  return res.data;
}

// ============================================================
// 医療者向け
// ============================================================

/**
 * 要約・危険度生成（doctor / nurse）
 */
export async function summarizeConsultation(id: string): Promise<SummarizeResult> {
  const res = await apiClient.post<SummarizeResult>(`/ai/consultations/${id}/summarize`);
  return res.data;
}
