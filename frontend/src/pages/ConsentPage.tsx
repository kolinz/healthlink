import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { postConsent } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { useLabels } from '../hooks/useLabels';

const CONSENT_VERSION = '1.0';

export default function ConsentPage() {
  const navigate = useNavigate();
  const { restoreSession } = useAuthStore();
  const labels = useLabels();

  const researchLabel = import.meta.env.VITE_LABEL_RESEARCH ?? '医療研究';

  const [checked, setChecked] = useState({
    item1: false,
    item2: false,
    item3: false,
    item4: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const allChecked = Object.values(checked).every(Boolean);

  const CONSENT_ITEMS = [
    {
      key: 'item1',
      title: `AI相談ログの${labels.doctor}・${labels.nurse}閲覧`,
      description: `AIとの相談内容を担当の${labels.doctor}・${labels.nurse}師が確認します。ケアの質向上のために使用されます。`,
    },
    {
      key: 'item2',
      title: `体調データの${researchLabel}利用`,
      description: `体調記録・AI相談内容は匿名化処理の上、${researchLabel}に利用される場合があります。`,
    },
    {
      key: 'item3',
      title: '個人情報の取り扱い',
      description: `登録情報は暗号化して保存されます。${researchLabel}機関への匿名データ提供を除き、第三者提供は行いません。`,
    },
    {
      key: 'item4',
      title: '同意の撤回',
      description: '同意はいつでも撤回できます。アカウント設定から手続きが可能です。',
    },
  ];

  const handleSubmit = async () => {
    if (!allChecked) return;
    setIsLoading(true);
    setError('');
    try {
      await postConsent(CONSENT_VERSION);
      await restoreSession();
      navigate('/', { replace: true });
    } catch {
      setError('同意の記録に失敗しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        {/* ロゴ */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mb-3 shadow-md">
            <svg viewBox="0 0 40 40" className="w-9 h-9" fill="none">
              <rect x="16" y="6" width="8" height="28" rx="2" fill="white" />
              <rect x="6" y="16" width="28" height="8" rx="2" fill="white" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-text-main">
            {import.meta.env.VITE_APP_NAME ?? 'HealthLink'}
          </h1>
        </div>

        {/* 案内バナー */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-5 flex gap-3">
          <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-blue-700">
            担当スタッフによりアカウントが作成されました。ご利用を開始するために、以下の同意事項をご確認ください。
          </p>
        </div>

        {/* 同意カード */}
        <div className="bg-card rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
          <h2 className="text-base font-semibold text-text-main mb-1">利用同意</h2>
          <p className="text-xs text-gray-500 mb-4">以下の項目をすべてご確認の上、チェックしてください。</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="space-y-3">
            {CONSENT_ITEMS.map(({ key, title, description }) => (
              <label
                key={key}
                className={`flex gap-3 p-3 rounded-xl border cursor-pointer transition-colors
                  ${checked[key as keyof typeof checked]
                    ? 'bg-primary-light border-primary'
                    : 'bg-background border-gray-100 hover:border-gray-300'
                  }`}
              >
                <input
                  type="checkbox"
                  checked={checked[key as keyof typeof checked]}
                  onChange={(e) => setChecked((prev) => ({ ...prev, [key]: e.target.checked }))}
                  className="mt-0.5 w-4 h-4 accent-primary flex-shrink-0"
                />
                <div>
                  <p className="text-sm font-medium text-text-main">{title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{description}</p>
                </div>
              </label>
            ))}
          </div>

          <p className="text-xs text-gray-400 mt-4 text-center">
            同意文書バージョン: {CONSENT_VERSION} | 同意日時が記録されます
          </p>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!allChecked || isLoading}
          className="w-full py-4 bg-primary hover:bg-primary-dark text-white font-semibold rounded-2xl text-base transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              処理中...
            </>
          ) : '同意して利用を開始する'}
        </button>
      </div>
    </div>
  );
}
