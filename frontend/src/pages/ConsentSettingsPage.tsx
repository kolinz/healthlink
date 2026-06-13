import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteConsent } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { formatDateTimeFull } from '../utils/date';

export default function ConsentSettingsPage() {
  const navigate = useNavigate();
  const { user, restoreSession, logout } = useAuthStore();

  const [showModal, setShowModal]             = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoading, setIsLoading]             = useState(false);
  const [isLoggingOut, setIsLoggingOut]       = useState(false);
  const [error, setError]                     = useState('');

  const handleWithdraw = async () => {
    setIsLoading(true);
    setError('');
    try {
      await deleteConsent();
      await restoreSession();
      navigate('/consent', { replace: true });
    } catch {
      setError('同意撤回の処理に失敗しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
      setShowModal(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch {
      navigate('/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="px-4 py-4 space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          {error}
        </div>
      )}

      {/* 同意状況カード */}
      <div className="bg-card rounded-2xl border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          現在の同意状況
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">ステータス</span>
            {user?.consent_agreed === 1 ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                同意済み
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                未同意
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">同意文書バージョン</span>
            <span className="text-sm font-medium text-text-main">
              {user?.consent_version ?? '—'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">同意日時</span>
            <span className="text-sm font-medium text-text-main">
              {formatDateTimeFull(user?.consent_agreed_at ?? null)}
            </span>
          </div>
        </div>
      </div>

      {/* 同意撤回セクション */}
      {user?.consent_agreed === 1 && (
        <>
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-red-700 mb-1">同意を撤回した場合の影響</p>
                <ul className="text-xs text-red-600 space-y-1">
                  <li>• 医療者によるAI相談ログ・体調データの閲覧が即時停止されます。</li>
                  <li>• 担当医師・看護師からのモニタリングが停止されます。</li>
                  <li>• データは保持されますが、医療者からはアクセスできなくなります。</li>
                  <li>• 再同意することで閲覧を再開できます。</li>
                </ul>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="w-full py-3 bg-white hover:bg-red-50 text-red-600 font-medium rounded-xl text-sm border border-red-300 hover:border-red-400 transition-colors"
          >
            同意を撤回する
          </button>
        </>
      )}

      {/* ログアウトボタン */}
      <div className="bg-card rounded-2xl border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          アカウント
        </h2>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-text-main">{user?.name ?? user?.username}</p>
            <p className="text-xs text-gray-400 mt-0.5">{user?.username}</p>
          </div>
          <div className="w-10 h-10 bg-primary-light rounded-full flex items-center justify-center text-primary font-bold">
            {(user?.name ?? user?.username ?? '?')[0]?.toUpperCase()}
          </div>
        </div>
        <button
          onClick={() => setShowLogoutModal(true)}
          className="w-full py-3 bg-white hover:bg-gray-50 text-gray-600 font-medium rounded-xl text-sm border border-gray-200 hover:border-gray-300 transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          ログアウト
        </button>
      </div>

      {/* 同意撤回確認モーダル */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-text-main">同意を撤回しますか？</h3>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              撤回後、医療者によるデータ閲覧が即時停止されます。この操作は後から取り消すことができます（再同意が必要です）。
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowModal(false)} disabled={isLoading}
                className="flex-1 py-2.5 border border-gray-300 text-gray-600 font-medium rounded-xl text-sm hover:bg-gray-50 transition-colors disabled:opacity-60">
                キャンセル
              </button>
              <button onClick={handleWithdraw} disabled={isLoading}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    処理中...
                  </>
                ) : '撤回する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ログアウト確認モーダル */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-base font-semibold text-text-main mb-2">ログアウトしますか？</h3>
            <p className="text-sm text-gray-600 mb-5">ログアウトするとログイン画面に戻ります。</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutModal(false)} disabled={isLoggingOut}
                className="flex-1 py-2.5 border border-gray-300 text-gray-600 font-medium rounded-xl text-sm hover:bg-gray-50 transition-colors disabled:opacity-60">
                キャンセル
              </button>
              <button onClick={handleLogout} disabled={isLoggingOut}
                className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-800 text-white font-medium rounded-xl text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                {isLoggingOut ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    処理中...
                  </>
                ) : 'ログアウト'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
