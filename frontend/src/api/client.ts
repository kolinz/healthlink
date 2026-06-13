import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// リフレッシュ中フラグ（多重リフレッシュを防止）
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token!);
  });
  failedQueue = [];
}

// リフレッシュ不要なパス（認証エンドポイント自身）
const SKIP_REFRESH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh'];

// ============================================================
// リクエストインターセプター: localStorage からアクセストークンを付与
// ============================================================
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken');
    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ============================================================
// レスポンスインターセプター
// ============================================================
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ error?: string }>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // CONSENT_REQUIRED: 同意画面へリダイレクト
    if (error.response?.data?.error === 'CONSENT_REQUIRED') {
      window.location.href = '/consent';
      return Promise.reject(error);
    }

    // 認証エンドポイント自身の401はリフレッシュしない
    const requestPath = originalRequest?.url ?? '';
    const isAuthEndpoint = SKIP_REFRESH_PATHS.some((p) => requestPath.includes(p));
    if (isAuthEndpoint) {
      return Promise.reject(error);
    }

    // 401 かつ未リトライの場合: リフレッシュトークンで再取得
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          return apiClient(originalRequest);
        }).catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const res = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        const newAccessToken: string = res.data.accessToken;
        localStorage.setItem('accessToken', newAccessToken);
        processQueue(null, newAccessToken);
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
