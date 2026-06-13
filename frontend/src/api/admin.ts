import apiClient from './client';

// ============================================================
// ユーザー管理
// ============================================================

export async function getUsers(params?: {
  role?: string;
  search?: string;
  is_active?: number;
}): Promise<any[]> {
  const res = await apiClient.get('/users', { params });
  return res.data;
}

export async function createUser(data: {
  username: string;
  password: string;
  role: string;
  name?: string;
  email?: string;
  position?: string;
  preferred_communication?: string;
}): Promise<any> {
  const res = await apiClient.post('/users', data);
  return res.data;
}

export async function updateUser(id: string, data: {
  role?: string;
  is_active?: number;
  name?: string;
  email?: string;
  position?: string;
  preferred_communication?: string;
}): Promise<any> {
  const res = await apiClient.put(`/users/${id}`, data);
  return res.data;
}

export async function resetPassword(id: string, password: string): Promise<void> {
  await apiClient.post(`/users/${id}/reset-password`, { password });
}

// ============================================================
// 組織管理
// ============================================================

export async function getOrganizations(): Promise<any[]> {
  const res = await apiClient.get('/organizations');
  return res.data;
}

export async function getOrganization(id: string): Promise<any> {
  const res = await apiClient.get(`/organizations/${id}`);
  return res.data;
}

export async function createOrganization(data: {
  name: string;
  code?: string;
}): Promise<any> {
  const res = await apiClient.post('/organizations', data);
  return res.data;
}

export async function updateOrganization(id: string, data: {
  name?: string;
  code?: string;
  is_active?: number;
}): Promise<any> {
  const res = await apiClient.put(`/organizations/${id}`, data);
  return res.data;
}

export async function getOrgMembers(orgId: string): Promise<any[]> {
  const res = await apiClient.get(`/organizations/${orgId}/members`);
  return res.data;
}

export async function addOrgMember(orgId: string, userId: string): Promise<any> {
  const res = await apiClient.post(`/organizations/${orgId}/members`, { user_id: userId });
  return res.data;
}

export async function removeOrgMember(orgId: string, userId: string): Promise<void> {
  await apiClient.delete(`/organizations/${orgId}/members/${userId}`);
}

// ============================================================
// 担当割当
// ============================================================

export async function getAssignments(params?: { patient_id?: string }): Promise<any[]> {
  const res = await apiClient.get('/assignments', { params });
  return res.data;
}

export async function createAssignment(data: {
  patient_id: string;
  provider_id: string;
}): Promise<any> {
  const res = await apiClient.post('/assignments', data);
  return res.data;
}

export async function deleteAssignment(id: string): Promise<void> {
  await apiClient.delete(`/assignments/${id}`);
}

// ============================================================
// 相談トピック（admin用: 全件取得）
// ============================================================

export async function getTopicsAdmin(): Promise<any[]> {
  // admin は is_active=0 も含めて全件管理したいが
  // バックエンドの GET /consultation-topics は is_active=1 のみ返すため
  // 現状は同エンドポイントを使用し、将来的に admin 専用エンドポイントを追加予定
  const res = await apiClient.get('/consultation-topics');
  return res.data;
}

export async function createTopic(data: {
  label: string;
  icon?: string;
  sort_order?: number;
  is_active?: number;
}): Promise<any> {
  const res = await apiClient.post('/consultation-topics', data);
  return res.data;
}

export async function updateTopic(id: string, data: {
  label?: string;
  icon?: string;
  sort_order?: number;
  is_active?: number;
}): Promise<any> {
  const res = await apiClient.put(`/consultation-topics/${id}`, data);
  return res.data;
}

export async function deleteTopic(id: string): Promise<void> {
  await apiClient.delete(`/consultation-topics/${id}`);
}

// ============================================================
// AI接続設定
// ============================================================

export async function getAiProviders(): Promise<any[]> {
  const res = await apiClient.get('/ai/providers');
  return res.data;
}

export async function createAiProvider(data: {
  name: string;
  provider_type: string;
  endpoint: string;
  api_key?: string;
  model?: string;
}): Promise<any> {
  const res = await apiClient.post('/ai/providers', data);
  return res.data;
}

export async function updateAiProvider(id: string, data: {
  name?: string;
  provider_type?: string;
  endpoint?: string;
  api_key?: string;
  model?: string;
}): Promise<any> {
  const res = await apiClient.put(`/ai/providers/${id}`, data);
  return res.data;
}

export async function deleteAiProvider(id: string): Promise<void> {
  await apiClient.delete(`/ai/providers/${id}`);
}

export async function activateAiProvider(id: string): Promise<any> {
  const res = await apiClient.put(`/ai/providers/${id}/activate`);
  return res.data;
}

// ============================================================
// APIキー管理
// ============================================================

export async function getApiKeys(): Promise<any[]> {
  const res = await apiClient.get('/api-keys');
  return res.data;
}

export async function createApiKey(data: {
  name: string;
  expires_at?: string | null;
}): Promise<any> {
  const res = await apiClient.post('/api-keys', data);
  return res.data;
}

export async function updateApiKey(id: string, data: {
  name?: string;
  expires_at?: string | null;
}): Promise<any> {
  const res = await apiClient.put(`/api-keys/${id}`, data);
  return res.data;
}

export async function deleteApiKey(id: string): Promise<void> {
  await apiClient.delete(`/api-keys/${id}`);
}

export async function revokeApiKey(id: string): Promise<void> {
  await apiClient.delete(`/api-keys/${id}`);
}

// ============================================================
// システム設定
// ============================================================

export async function getSystemSettings(): Promise<any[]> {
  const res = await apiClient.get('/system-settings');
  return res.data;
}

export async function updateSystemSetting(key: string, value: string): Promise<any> {
  const res = await apiClient.put(`/system-settings/${key}`, { value });
  return res.data;
}
