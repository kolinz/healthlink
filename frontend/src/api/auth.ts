import apiClient from './client';

// ============================================================
// 型定義
// ============================================================

export interface RegisterInput {
  username: string;
  email?: string;
  password: string;
  name?: string;
  age?: number;
  preferred_communication?: 'email' | 'chat' | 'in_person';
  consent_agreed: true;
  consent_version: string;
}

export interface RegisterResponse {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    username: string;
    role: string;
    consent_agreed: number;
  };
}

export interface MeResponse {
  id: string;
  username: string;
  role: string;
  is_active: number;
  consent_agreed: number;
  consent_agreed_at: string | null;
  consent_version: string | null;
  consent_withdrawn_at: string | null;
  created_at: string;
  name: string | null;
  email: string | null;
  age: number | null;
  preferred_communication: 'email' | 'chat' | 'in_person' | null;
}

// ============================================================
// API関数
// ============================================================

/**
 * 患者セルフ登録（3ステップ完了後に呼び出す）
 */
export async function register(input: RegisterInput): Promise<RegisterResponse> {
  const res = await apiClient.post<RegisterResponse>('/auth/register', input);
  return res.data;
}

/**
 * ログイン
 */
export async function login(username: string, password: string): Promise<LoginResponse> {
  const res = await apiClient.post<LoginResponse>('/auth/login', { username, password });
  return res.data;
}

/**
 * ログアウト（リフレッシュトークン無効化）
 */
export async function logout(refreshToken: string): Promise<void> {
  await apiClient.post('/auth/logout', { refreshToken });
}

/**
 * アクセストークン再発行
 */
export async function refresh(refreshToken: string): Promise<{ accessToken: string }> {
  const res = await apiClient.post<{ accessToken: string }>('/auth/refresh', { refreshToken });
  return res.data;
}

/**
 * ログイン中ユーザー情報取得
 */
export async function getMe(): Promise<MeResponse> {
  const res = await apiClient.get<MeResponse>('/auth/me');
  return res.data;
}

/**
 * 初回同意記録（admin作成ユーザーが初回ログイン時に呼び出す）
 */
export async function postConsent(consentVersion: string): Promise<void> {
  await apiClient.post('/auth/consent', {
    consent_agreed: true,
    consent_version: consentVersion,
  });
}

/**
 * 同意撤回
 */
export async function deleteConsent(): Promise<void> {
  await apiClient.delete('/auth/consent');
}
