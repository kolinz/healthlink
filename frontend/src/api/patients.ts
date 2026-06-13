import apiClient from './client';
import type { DailyLog } from './dailyLogs';
import type { Consultation } from './consultations';

// ============================================================
// 型定義
// ============================================================

export interface Patient {
  id: string;
  username: string;
  role: string;
  is_active: number;
  consent_agreed: number;
  consent_agreed_at: string | null;
  consent_version: string | null;
  consent_withdrawn_at: string | null;
  created_at: string;
  // プロフィール
  name: string | null;
  email: string | null;
  age: number | null;
  preferred_communication: 'email' | 'chat' | 'in_person' | null;
  // 集計（一覧用）
  last_logged_at: string | null;
  latest_status: string | null;
  latest_risk_level: string | null;
}

// ============================================================
// 患者モニタリング API（doctor / nurse 向け）
// ============================================================

/**
 * 同一組織の患者一覧取得
 */
export async function getPatients(): Promise<Patient[]> {
  const res = await apiClient.get<Patient[]>('/patients');
  return res.data;
}

/**
 * 患者詳細取得
 */
export async function getPatient(id: string): Promise<Patient> {
  const res = await apiClient.get<Patient>(`/patients/${id}`);
  return res.data;
}

/**
 * 患者の体調ログ一覧取得
 */
export async function getPatientLogs(
  patientId: string,
  params?: { from?: string; to?: string },
): Promise<DailyLog[]> {
  const res = await apiClient.get<DailyLog[]>(`/patients/${patientId}/daily-logs`, { params });
  return res.data;
}

/**
 * 患者のAI相談履歴一覧取得
 */
export async function getPatientConsultations(patientId: string): Promise<Consultation[]> {
  const res = await apiClient.get<Consultation[]>(`/patients/${patientId}/consultations`);
  return res.data;
}
