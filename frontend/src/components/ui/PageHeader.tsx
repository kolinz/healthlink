// ページヘッダーコンポーネント
// title / subtitle / action を受け取る

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode; // 右端に表示するボタン等
  onBack?: () => void;      // 戻るボタンを表示する場合
}

export function PageHeader({ title, subtitle, action, onBack }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <div>
          <h1 className="text-2xl font-bold text-text-main">{title}</h1>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
