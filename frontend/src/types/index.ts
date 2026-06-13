// TODO: P4-1 で実装
// バックエンドの型定義と同期させる

export type Role = 'patient' | 'doctor' | 'nurse' | 'admin';

export interface User {
  id: string;
  username: string;
  role: Role;
  is_active: number;
  consent_agreed: number;
  consent_agreed_at?: string;
  consent_version?: string;
  consent_withdrawn_at?: string;
  created_at: string;
}
