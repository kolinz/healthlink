// 患者向けモバイルレイアウト
// ヘッダー + ボトムナビ構成

import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

interface MobileLayoutProps {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
}

const NAV_ITEMS = [
  {
    path: '/',
    label: 'ホーム',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  },
  {
    path: '/logs',
    label: '記録',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  },
  {
    path: '/consultations',
    label: 'AI相談',
    icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z',
  },
  {
    path: '/settings/consent',
    label: '設定',
    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  },
];

export function MobileLayout({ children, title, showBack = false }: MobileLayoutProps) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user }  = useAuthStore();

  const appName = import.meta.env.VITE_APP_NAME ?? 'HealthLink';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-100 px-4 pt-12 pb-3 flex items-center gap-3 flex-shrink-0">
        {showBack ? (
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        ) : (
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 40 40" className="w-5 h-5" fill="none">
              <rect x="16" y="6" width="8" height="28" rx="2" fill="white" />
              <rect x="6" y="16" width="28" height="8" rx="2" fill="white" />
            </svg>
          </div>
        )}
        <h1 className="text-base font-semibold text-text-main flex-1">
          {title ?? appName}
        </h1>
        {/* ユーザーアバター */}
        <div className="w-8 h-8 bg-primary-light rounded-full flex items-center justify-center text-primary font-bold text-sm">
          {(user?.name ?? user?.username ?? '?')[0]?.toUpperCase()}
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      {/* ボトムナビ */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex z-30">
        {NAV_ITEMS.map(({ path, label, icon }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex-1 flex flex-col items-center py-2 gap-0.5 text-xs transition-colors
                ${isActive ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={isActive ? 2.5 : 1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
              </svg>
              <span>{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
