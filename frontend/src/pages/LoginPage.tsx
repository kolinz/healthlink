import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

function getDefaultPath(role: string, consentAgreed: number): string {
  if (role === 'patient') {
    return consentAgreed ? '/' : '/consent';
  }
  if (role === 'doctor' || role === 'nurse') return '/dashboard';
  if (role === 'admin') return '/admin/users';
  return '/';
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!username || !password) {
      setError('ユーザー名とパスワードを入力してください');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      // login() はレスポンスの user を store にセットして返す
      await login(username, password);

      // store から直接取得せず、login のレスポンスで判断するため
      // authStore の login action がセットした値を getState() で取得
      const { user } = useAuthStore.getState();
      if (!user) return;

      navigate(getDefaultPath(user.role, user.consent_agreed), { replace: true });
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'ログインに失敗しました';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* ロゴ */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-3 shadow-md">
            <svg viewBox="0 0 40 40" className="w-10 h-10" fill="none">
              <rect x="16" y="6" width="8" height="28" rx="2" fill="white" />
              <rect x="6" y="16" width="28" height="8" rx="2" fill="white" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-text-main">
            {import.meta.env.VITE_APP_NAME ?? 'HealthLink'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">患者体調共有・AI相談ポータル</p>
        </div>

        {/* カード */}
        <div className="bg-card rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-text-main mb-5">ログイン</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-main mb-1">
                ユーザー名
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="username"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-main mb-1">
                パスワード
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full py-2.5 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  ログイン中...
                </>
              ) : 'ログイン'}
            </button>
          </div>

          <p className="mt-4 text-center text-sm text-gray-500">
            アカウントをお持ちでない方は{' '}
            <Link to="/register" className="text-primary hover:underline font-medium">
              新規登録はこちら
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
