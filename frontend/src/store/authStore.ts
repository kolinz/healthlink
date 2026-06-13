import { create } from 'zustand';
import apiClient from '../api/client';

export type Role = 'patient' | 'doctor' | 'nurse' | 'admin';

export interface AuthUser {
  id: string;
  username: string;
  role: Role;
  is_active: number;
  consent_agreed: number;
  consent_agreed_at: string | null;
  consent_version: string | null;
  consent_withdrawn_at: string | null;
  created_at: string;
  name: string | null;
  email: string | null;
  position: string | null;
  preferred_communication: 'email' | 'chat' | 'in_person' | null;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
}

interface AuthActions {
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser) => void;
  setAccessToken: (token: string) => void;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  user: null,
  accessToken: localStorage.getItem('accessToken'),
  // トークンがある場合は復元中として isLoading=true で開始
  // これにより restoreSession 完了前に ProtectedRoute が /login へ飛ばすのを防ぐ
  isLoading: !!localStorage.getItem('accessToken'),

  login: async (username: string, password: string) => {
    const res = await apiClient.post('/auth/login', { username, password });
    const { accessToken, refreshToken, user } = res.data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    set({ accessToken, user });
  },

  logout: async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    try {
      if (refreshToken) {
        await apiClient.post('/auth/logout', { refreshToken });
      }
    } catch {
      // 失敗しても続行
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      set({ user: null, accessToken: null });
    }
  },

  setUser: (user: AuthUser) => { set({ user }); },

  setAccessToken: (token: string) => {
    localStorage.setItem('accessToken', token);
    set({ accessToken: token });
  },

  restoreSession: async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      set({ isLoading: false });
      return;
    }

    set({ isLoading: true });
    try {
      const res = await apiClient.get('/auth/me');
      set({ user: res.data, accessToken: token, isLoading: false });
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      set({ user: null, accessToken: null, isLoading: false });
    }
  },
}));
