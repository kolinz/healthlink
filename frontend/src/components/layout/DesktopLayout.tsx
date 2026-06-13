import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useLabels } from '../../hooks/useLabels';

interface DesktopLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  path: string;
  label: string;
  icon: string;
  roles: string[];
}

export function DesktopLayout({ children }: DesktopLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const labels = useLabels();

  const NAV_ITEMS: NavItem[] = [
    // doctor / nurse
    {
      path: '/dashboard',
      label: `${labels.patient}一覧`,
      icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0',
      roles: ['doctor', 'nurse'],
    },
    // admin
    {
      path: '/admin/users',
      label: 'ユーザー管理',
      icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
      roles: ['admin'],
    },
    {
      path: '/admin/organizations',
      label: '組織管理',
      icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
      roles: ['admin'],
    },
    {
      path: '/admin/members',
      label: 'メンバー管理',
      icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0',
      roles: ['admin'],
    },
    {
      path: '/admin/assignments',
      label: '担当割当',
      icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
      roles: ['admin'],
    },
    {
      path: '/admin/consultation-topics',
      label: '相談トピック',
      icon: 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z',
      roles: ['admin'],
    },
    {
      path: '/admin/ai-providers',
      label: 'AI接続設定',
      icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2',
      roles: ['admin'],
    },
    {
      path: '/admin/system-settings',
      label: 'システム設定',
      icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
      roles: ['admin'],
    },
    {
      path: '/admin/api-keys',
      label: 'APIキー管理',
      icon: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z',
      roles: ['admin'],
    },
  ];

  const visibleItems = NAV_ITEMS.filter((item) =>
    user?.role ? item.roles.includes(user.role) : false
  );

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const appName = import.meta.env.VITE_APP_NAME ?? 'HealthLink';

  return (
    <div className="flex min-h-screen bg-background">
      {/* サイドバー */}
      <aside className="w-56 bg-white border-r border-gray-100 flex flex-col pt-8 px-4 fixed h-full z-20">
        {/* ロゴ */}
        <div className="flex items-center gap-2 mb-8 px-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 40 40" className="w-5 h-5" fill="none">
              <rect x="16" y="6" width="8" height="28" rx="2" fill="white" />
              <rect x="6" y="16" width="28" height="8" rx="2" fill="white" />
            </svg>
          </div>
          <span className="font-bold text-text-main text-sm truncate">{appName}</span>
        </div>

        {/* ナビゲーション */}
        <nav className="space-y-1 flex-1 overflow-y-auto">
          {visibleItems.map(({ path, label, icon }) => {
            const isActive = location.pathname === path ||
              (path !== '/dashboard' && location.pathname.startsWith(path));
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
                  ${isActive
                    ? 'bg-primary-light text-primary'
                    : 'text-gray-500 hover:bg-background hover:text-text-main'
                  }`}
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                </svg>
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </nav>

        {/* ユーザー情報 + ログアウト */}
        <div className="pb-6 space-y-2 flex-shrink-0">
          <div className="px-3 py-2 bg-background rounded-xl">
            <p className="text-xs font-medium text-text-main truncate">
              {user?.name ?? user?.username}
            </p>
            <p className="text-xs text-gray-400">
              {user?.role === 'doctor' ? labels.doctor
               : user?.role === 'nurse' ? labels.nurse
               : labels.admin}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            ログアウト
          </button>
        </div>
      </aside>

      {/* メインコンテンツ */}
      <main className="ml-56 flex-1 min-h-screen">
        {children}
      </main>
    </div>
  );
}
