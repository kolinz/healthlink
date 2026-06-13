import apiClient from './client';

// ============================================================
// 型定義
// ============================================================

export type StepsYesterday =
  | 'under_2000'
  | '2000_4000'
  | '4000_6000'
  | '6000_8000'
  | 'over_8000';

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

export interface CreateDailyLogInput {
  fever_score: number;
  steps_yesterday: StepsYesterday;
  condition: number;
  appetite_score: number;
  sleep_quality: number;
  attention_score: number;
  note?: string;
}

export interface MedicalNote {
  id: string;
  daily_log_id: string;
  provider_id: string;
  provider_username: string;
  provider_name: string | null;
  note: string;
  created_at: string;
  updated_at: string | null;
}

// ============================================================
// 患者向け API
// ============================================================

/**
 * 自分の体調ログ一覧を取得（patient）
 */
export async function getDailyLogs(params?: {
  from?: string;
  to?: string;
}): Promise<DailyLog[]> {
  const res = await apiClient.get<DailyLog[]>('/daily-logs', { params });
  return res.data;
}

/**
 * 体調入力（patient）
 */
export async function createDailyLog(input: CreateDailyLogInput): Promise<DailyLog> {
  const res = await apiClient.post<DailyLog>('/daily-logs', input);
  return res.data;
}

/**
 * 体調ログ詳細取得
 */
export async function getDailyLog(id: string): Promise<DailyLog> {
  const res = await apiClient.get<DailyLog>(`/daily-logs/${id}`);
  return res.data;
}

// ============================================================
// 医療者向け API
// ============================================================

/**
 * ステータス更新（doctor / nurse）
 */
export async function updateLogStatus(
  id: string,
  status: LogStatus,
): Promise<DailyLog> {
  const res = await apiClient.put<DailyLog>(`/daily-logs/${id}/status`, { status });
  return res.data;
}

/**
 * メモ一覧取得（doctor / nurse）
 */
export async function getNotes(logId: string): Promise<MedicalNote[]> {
  const res = await apiClient.get<MedicalNote[]>(`/daily-logs/${logId}/notes`);
  return res.data;
}

/**
 * メモ追加（doctor / nurse）
 */
export async function createNote(logId: string, note: string): Promise<MedicalNote> {
  const res = await apiClient.post<MedicalNote>(`/daily-logs/${logId}/notes`, { note });
  return res.data;
}

/**
 * メモ更新（作成者のみ）
 */
export async function updateNote(
  logId: string,
  noteId: string,
  note: string,
): Promise<MedicalNote> {
  const res = await apiClient.put<MedicalNote>(
    `/daily-logs/${logId}/notes/${noteId}`,
    { note },
  );
  return res.data;
}
