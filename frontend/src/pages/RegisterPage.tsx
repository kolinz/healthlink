import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { register } from '../api/auth';
import { useAuthStore } from '../store/authStore';

// ============================================================
// 型定義
// ============================================================
interface Step1Data {
  username: string;
  email: string;
  password: string;
  passwordConfirm: string;
}

interface Step2Data {
  name: string;
  age: string;
  preferred_communication: 'email' | 'chat' | 'in_person' | '';
}

const CONSENT_ITEMS = [
  {
    id: 'ai_log',
    title: 'AI相談ログの医療者閲覧',
    description: 'AIとの相談内容を担当の医師・看護師が確認します。ケアの質向上のために使用されます。',
  },
  {
    id: 'research',
    title: '体調データの研究利用',
    description: '体調記録・AI相談内容は匿名化処理の上、医療研究に利用される場合があります。',
  },
  {
    id: 'privacy',
    title: '個人情報の取り扱い',
    description: '登録情報は暗号化して保存されます。研究機関への匿名データ提供を除き、第三者提供は行いません。',
  },
  {
    id: 'withdraw',
    title: '同意の撤回',
    description: '同意はいつでも撤回できます。アカウント設定から手続きが可能です。',
  },
];

// ============================================================
// ステッパーコンポーネント
// ============================================================
function Stepper({ currentStep }: { currentStep: number }) {
  const steps = ['アカウント情報', 'プロフィール', '同意確認'];
  const progress = [33, 66, 100];

  return (
    <div className="mb-6">
      {/* プログレスバー */}
      <div className="w-full bg-gray-200 rounded-full h-1.5 mb-4">
        <div
          className="bg-primary h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${progress[currentStep - 1]}%` }}
        />
      </div>
      {/* ステップ表示 */}
      <div className="flex justify-between">
        {steps.map((label, index) => {
          const step = index + 1;
          const isDone    = step < currentStep;
          const isCurrent = step === currentStep;
          return (
            <div key={step} className="flex flex-col items-center gap-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                  ${isDone    ? 'bg-primary text-white' : ''}
                  ${isCurrent ? 'bg-primary text-white ring-2 ring-primary ring-offset-2' : ''}
                  ${!isDone && !isCurrent ? 'bg-gray-200 text-gray-400' : ''}
                `}
              >
                {isDone ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : step}
              </div>
              <span className={`text-xs ${isCurrent ? 'text-primary font-medium' : 'text-gray-400'}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// パスワード強度インジケーター
// ============================================================
function PasswordStrength({ password }: { password: string }) {
  const getStrength = () => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8)              score++;
    if (/[A-Z]/.test(password))            score++;
    if (/[0-9]/.test(password))            score++;
    if (/[^A-Za-z0-9]/.test(password))     score++;
    return score;
  };

  const strength = getStrength();
  const labels   = ['', '弱い', '普通', '強い', 'とても強い'];
  const colors   = ['', 'bg-red-400', 'bg-yellow-400', 'bg-blue-400', 'bg-green-500'];

  if (!password) return null;

  return (
    <div className="mt-1.5">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${i <= strength ? colors[strength] : 'bg-gray-200'}`}
          />
        ))}
      </div>
      <p className={`text-xs ${strength <= 1 ? 'text-red-500' : strength === 2 ? 'text-yellow-600' : 'text-green-600'}`}>
        パスワード強度: {labels[strength]}
      </p>
    </div>
  );
}

// ============================================================
// Step 1: アカウント情報
// ============================================================
function Step1({
  data, setData, onNext,
}: {
  data: Step1Data;
  setData: (d: Step1Data) => void;
  onNext: () => void;
}) {
  const [error, setError] = useState('');

  const validate = () => {
    if (!data.username) return 'ユーザー名は必須です';
    if (data.username.length < 3) return 'ユーザー名は3文字以上で入力してください';
    if (!data.password) return 'パスワードは必須です';
    if (data.password.length < 8) return 'パスワードは8文字以上で入力してください';
    if (data.password !== data.passwordConfirm) return 'パスワードが一致しません';
    return '';
  };

  const handleNext = () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    onNext();
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
      )}
      <div>
        <label className="block text-sm font-medium text-text-main mb-1">ユーザー名 <span className="text-red-500">*</span></label>
        <input
          type="text"
          value={data.username}
          onChange={(e) => setData({ ...data, username: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="例: yamada_hanako"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-main mb-1">メールアドレス</label>
        <input
          type="email"
          value={data.email}
          onChange={(e) => setData({ ...data, email: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="example@email.com"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-main mb-1">パスワード <span className="text-red-500">*</span></label>
        <input
          type="password"
          value={data.password}
          onChange={(e) => setData({ ...data, password: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="8文字以上"
        />
        <PasswordStrength password={data.password} />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-main mb-1">パスワード（確認） <span className="text-red-500">*</span></label>
        <input
          type="password"
          value={data.passwordConfirm}
          onChange={(e) => setData({ ...data, passwordConfirm: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="パスワードを再入力"
        />
      </div>
      <button
        onClick={handleNext}
        className="w-full py-2.5 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg text-sm transition-colors"
      >
        次へ
      </button>
    </div>
  );
}

// ============================================================
// Step 2: プロフィール
// ============================================================
function Step2({
  data, setData, onNext, onBack,
}: {
  data: Step2Data;
  setData: (d: Step2Data) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const commOptions = [
    { value: 'email',     label: 'メール' },
    { value: 'chat',      label: 'チャット' },
    { value: 'in_person', label: '対面' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-text-main mb-1">氏名</label>
        <input
          type="text"
          value={data.name}
          onChange={(e) => setData({ ...data, name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="山田 花子"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-main mb-1">年齢</label>
        <input
          type="number"
          value={data.age}
          onChange={(e) => setData({ ...data, age: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="例: 64"
          min={0}
          max={150}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-main mb-2">希望連絡方法</label>
        <div className="flex gap-2">
          {commOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setData({ ...data, preferred_communication: opt.value as Step2Data['preferred_communication'] })}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors
                ${data.preferred_communication === opt.value
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-primary'
                }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <button
          onClick={onBack}
          className="flex-1 py-2.5 border border-gray-300 text-gray-600 font-medium rounded-lg text-sm hover:bg-gray-50 transition-colors"
        >
          戻る
        </button>
        <button
          onClick={onNext}
          className="flex-1 py-2.5 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg text-sm transition-colors"
        >
          次へ
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Step 3: 同意確認
// ============================================================
function Step3({
  onBack, onSubmit, isLoading, error,
}: {
  onBack: () => void;
  onSubmit: (checked: boolean[]) => void;
  isLoading: boolean;
  error: string;
}) {
  const [checked, setChecked] = useState<boolean[]>(CONSENT_ITEMS.map(() => false));
  const allChecked = checked.every(Boolean);

  const toggle = (i: number) => {
    const next = [...checked];
    next[i] = !next[i];
    setChecked(next);
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
      )}

      <p className="text-sm text-gray-600">
        以下の項目をすべてご確認の上、チェックしてください。
      </p>

      <div className="space-y-3">
        {CONSENT_ITEMS.map((item, i) => (
          <label
            key={item.id}
            className={`flex gap-3 p-3 rounded-lg border cursor-pointer transition-colors
              ${checked[i] ? 'border-primary bg-primary-light' : 'border-gray-200 bg-white hover:border-primary'}`}
          >
            <input
              type="checkbox"
              checked={checked[i]}
              onChange={() => toggle(i)}
              className="mt-0.5 accent-primary flex-shrink-0"
            />
            <div>
              <p className="text-sm font-medium text-text-main">{item.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
            </div>
          </label>
        ))}
      </div>

      <p className="text-xs text-gray-400 text-center">
        同意文書バージョン: 1.0 | 同意日時が記録されます
      </p>

      <div className="flex gap-2 pt-1">
        <button
          onClick={onBack}
          disabled={isLoading}
          className="flex-1 py-2.5 border border-gray-300 text-gray-600 font-medium rounded-lg text-sm hover:bg-gray-50 transition-colors disabled:opacity-60"
        >
          戻る
        </button>
        <button
          onClick={() => onSubmit(checked)}
          disabled={!allChecked || isLoading}
          className="flex-1 py-2.5 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              登録中...
            </>
          ) : '登録完了'}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// RegisterPage（メインコンポーネント）
// ============================================================
export default function RegisterPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { setUser, setAccessToken } = useAuthStore();

  // パスからステップを判定
  const getStep = () => {
    if (location.pathname === '/register/profile') return 2;
    if (location.pathname === '/register/consent') return 3;
    return 1;
  };
  const currentStep = getStep();

  const [step1, setStep1] = useState<Step1Data>({
    username: '', email: '', password: '', passwordConfirm: '',
  });
  const [step2, setStep2] = useState<Step2Data>({
    name: '', age: '', preferred_communication: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleSubmit = async (checked: boolean[]) => {
    if (!checked.every(Boolean)) return;
    setIsLoading(true);
    setSubmitError('');
    try {
      const res = await register({
        username: step1.username,
        email: step1.email || undefined,
        password: step1.password,
        name: step2.name || undefined,
        age: step2.age ? parseInt(step2.age) : undefined,
        preferred_communication: step2.preferred_communication || undefined,
        consent_agreed: true,
        consent_version: '1.0',
      });
      localStorage.setItem('accessToken', res.accessToken);
      localStorage.setItem('refreshToken', res.refreshToken);
      setAccessToken(res.accessToken);
      // /auth/me を呼んでユーザー情報を取得
      await useAuthStore.getState().restoreSession();
      navigate('/', { replace: true });
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? '登録に失敗しました';
      setSubmitError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* ロゴ */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-2 shadow-md">
            <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none">
              <rect x="16" y="6" width="8" height="28" rx="2" fill="white" />
              <rect x="6" y="16" width="28" height="8" rx="2" fill="white" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-text-main">新規登録</h1>
        </div>

        {/* カード */}
        <div className="bg-card rounded-2xl shadow-sm border border-gray-100 p-6">
          <Stepper currentStep={currentStep} />

          {currentStep === 1 && (
            <Step1
              data={step1}
              setData={setStep1}
              onNext={() => navigate('/register/profile')}
            />
          )}
          {currentStep === 2 && (
            <Step2
              data={step2}
              setData={setStep2}
              onNext={() => navigate('/register/consent')}
              onBack={() => navigate('/register')}
            />
          )}
          {currentStep === 3 && (
            <Step3
              onBack={() => navigate('/register/profile')}
              onSubmit={handleSubmit}
              isLoading={isLoading}
              error={submitError}
            />
          )}
        </div>

        <p className="mt-4 text-center text-sm text-gray-500">
          既にアカウントをお持ちの方は{' '}
          <Link to="/login" className="text-primary hover:underline font-medium">
            ログインはこちら
          </Link>
        </p>
      </div>
    </div>
  );
}
