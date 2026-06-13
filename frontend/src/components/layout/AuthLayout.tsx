// 認証画面向けレイアウト
// センタリング + HealthLink ロゴ表示

interface AuthLayoutProps {
  children: React.ReactNode;
  showLogo?: boolean;
}

export function AuthLayout({ children, showLogo = true }: AuthLayoutProps) {
  const appName = import.meta.env.VITE_APP_NAME ?? 'HealthLink';

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8">
      {showLogo && (
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-3 shadow-md">
            <svg viewBox="0 0 40 40" className="w-10 h-10" fill="none">
              <rect x="16" y="6" width="8" height="28" rx="2" fill="white" />
              <rect x="6" y="16" width="28" height="8" rx="2" fill="white" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-text-main">{appName}</h1>
          <p className="text-sm text-gray-500 mt-1">患者体調共有・AI相談ポータル</p>
        </div>
      )}
      <div className="w-full max-w-sm">
        {children}
      </div>
    </div>
  );
}
