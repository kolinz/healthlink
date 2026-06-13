// ============================================================
// 共通型定義
// ============================================================

export type Role = 'patient' | 'doctor' | 'nurse' | 'admin';

// JWTペイロード
export interface JwtPayload {
  userId: string;
  role: Role;
}

// users テーブル
export interface User {
  id: string;
  username: string;
  password_hash: string;
  role: Role;
  is_active: number;
  consent_agreed: number;
  consent_agreed_at: string | null;
  consent_version: string | null;
  consent_withdrawn_at: string | null;
  created_at: string;
}

// profiles テーブル
export interface Profile {
  id: string;
  user_id: string;
  name: string | null;
  email: string | null;
  age: number | null;
  preferred_communication: 'email' | 'chat' | 'in_person' | null;
  updated_at: string | null;
  created_at: string;
}

// daily_logs テーブル
export type StepsYesterday = 'under_2000' | '2000_4000' | '4000_6000' | '6000_8000' | 'over_8000';
export type LogStatus = 'unchecked' | 'checked' | 'responded';

export interface DailyLog {
  id: string;
  patient_id: string;
  logged_at: string;
  fever_score: number;
  steps_yesterday: StepsYesterday;
  condition: number;
  appetite_score: number;
  sleep_quality: number;
  attention_score: number;
  note: string | null;
  status: LogStatus;
  status_updated_by: string | null;
  status_updated_at: string | null;
}

// ai_consultations テーブル
export type RiskLevel = 'low' | 'medium' | 'high';

export interface AiConsultation {
  id: string;
  patient_id: string;
  ai_provider_id: string;
  topic_id: string | null;
  dify_conversation_id: string | null;
  risk_level: RiskLevel | null;
  summary: string | null;
  started_at: string;
}

// ai_messages テーブル
export interface AiMessage {
  id: string;
  consultation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

// ai_providers テーブル
export type ProviderType = 'ollama' | 'openai' | 'dify';

export interface AiProvider {
  id: string;
  name: string;
  provider_type: ProviderType;
  endpoint: string;
  api_key: string | null;
  model: string | null;
  active: number;
  created_at: string;
}

// api_keys テーブル
export interface ApiKey {
  id: string;
  name: string;
  key_hash: string;
  is_active: number;
  last_used_at: string | null;
  created_by: string;
  created_at: string;
  expires_at: string | null;
}

// Express の Request 型を拡張して req.user を追加
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
