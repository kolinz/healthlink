import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createDailyLog } from '../api/dailyLogs';
import { CONDITION_OPTIONS } from '../constants/condition';

// ============================================================
// 歩数選択肢
// ============================================================
const STEPS_OPTIONS = [
  { value: 'under_2000', label: '2,000歩未満' },
  { value: '2000_4000', label: '2,000〜4,000歩' },
  { value: '4000_6000', label: '4,000〜6,000歩' },
  { value: '6000_8000', label: '6,000〜8,000歩' },
  { value: 'over_8000', label: '8,000歩以上' },
] as const;

// ============================================================
// スライダーコンポーネント
// ============================================================
function ScoreSlider({
  label,
  description,
  value,
  onChange,
  leftLabel,
  rightLabel,
}: {
  label: string;
  description: string;
  value: number;
  onChange: (v: number) => void;
  leftLabel: string;
  rightLabel: string;
}) {
  return (
    <div className="bg-card rounded-2xl border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-semibold text-text-main">{label}</p>
        <span className="text-lg font-bold text-primary">{value}</span>
      </div>
      <p className="text-xs text-gray-500 mb-3">{description}</p>
      <input
        type="range"
        min={1}
        max={10}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
      <div className="flex justify-between mt-1">
        <span className="text-xs text-gray-400">{leftLabel}</span>
        <span className="text-xs text-gray-400">{rightLabel}</span>
      </div>
    </div>
  );
}

// ============================================================
// HealthInputPage
// ============================================================
export default function HealthInputPage() {
  const navigate = useNavigate();

  // 必須項目
  const [condition, setCondition]         = useState<number | null>(null);
  const [attentionScore, setAttentionScore] = useState(3);
  const [appetiteScore, setAppetiteScore]   = useState(3);
  const [feverScore, setFeverScore]         = useState(3);
  const [sleepQuality, setSleepQuality]     = useState(3);
  const [stepsYesterday, setStepsYesterday] = useState<string | null>(null);

  // 任意項目
  const [note, setNote] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // 全必須項目が入力済みかチェック
  const isValid = condition !== null && stepsYesterday !== null;

  const handleSubmit = async () => {
    if (!isValid) return;
    setIsLoading(true);
    setError('');
    try {
      await createDailyLog({
        condition: condition!,
        attention_score: attentionScore,
        appetite_score: appetiteScore,
        fever_score: feverScore,
        sleep_quality: sleepQuality,
        steps_yesterday: stepsYesterday!,
        note: note || undefined,
      });
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message ?? '送信に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="pb-8">
      <div className="px-4 py-4 space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
            {error}
          </div>
        )}

        {/* ① コンディション（5択ボタン） */}
        <div className="bg-card rounded-2xl border border-gray-100 p-4">
          <p className="text-sm font-semibold text-text-main mb-1">コンディション <span className="text-red-500">*</span></p>
          <p className="text-xs text-gray-500 mb-3">今日の体感で選んでください。</p>
          <div className="flex gap-1.5">
            {CONDITION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setCondition(opt.value)}
                className={`flex-1 flex flex-col items-center py-2 px-1 rounded-xl border text-xs font-medium transition-colors
                  ${condition === opt.value
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-primary'
                  }`}
              >
                <span className="text-lg mb-0.5">{opt.emoji}</span>
                <span className="leading-tight text-center">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ② 構ってスコア */}
        <ScoreSlider
          label="構ってスコア ✋"
          description="今日、スタッフに声をかけてほしい度合いを教えてください。"
          value={attentionScore}
          onChange={setAttentionScore}
          leftLabel="😶 構ってほしくない"
          rightLabel="🙋 とても構ってほしい"
        />

        {/* ③ 食欲 */}
        <ScoreSlider
          label="食欲 🍽️"
          description="今日の体感で選んでください。"
          value={appetiteScore}
          onChange={setAppetiteScore}
          leftLabel="😞 食欲なし"
          rightLabel="😋 食欲満々"
        />

        {/* ④ 熱っぽさ */}
        <ScoreSlider
          label="熱っぽさ 🌡️"
          description="体温計は不要です。今日の体感で選んでください。"
          value={feverScore}
          onChange={setFeverScore}
          leftLabel="😊 全く熱くない"
          rightLabel="🥵 とても熱っぽい"
        />

        {/* ⑤ ぐっすり度 */}
        <ScoreSlider
          label="ぐっすり度 💤"
          description="昨夜の体感で選んでください。"
          value={sleepQuality}
          onChange={setSleepQuality}
          leftLabel="😫 全く眠れなかった"
          rightLabel="😴 ぐっすり眠れた"
        />

        {/* ⑥ 昨日の歩数（5択セレクトボタン） */}
        <div className="bg-card rounded-2xl border border-gray-100 p-4">
          <p className="text-sm font-semibold text-text-main mb-1">昨日の歩数 👟 <span className="text-red-500">*</span></p>
          <p className="text-xs text-gray-500 mb-3">
            歩数計がなくても大丈夫です。前日のだいたいの歩数を選んでください。
          </p>
          <div className="grid grid-cols-1 gap-2">
            {STEPS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStepsYesterday(opt.value)}
                className={`w-full py-2.5 px-4 rounded-xl border text-sm font-medium transition-colors text-left
                  ${stepsYesterday === opt.value
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-primary'
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* メモ（任意） */}
        <div className="bg-card rounded-2xl border border-gray-100 p-4">
          <p className="text-sm font-semibold text-text-main mb-1">メモ <span className="text-xs text-gray-400 font-normal">（任意）</span></p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="気になること、スタッフへの伝言など"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* 送信ボタン */}
        <button
          onClick={handleSubmit}
          disabled={!isValid || isLoading}
          className="w-full py-4 bg-primary hover:bg-primary-dark text-white font-semibold rounded-2xl text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              送信中...
            </>
          ) : '記録を送信する'}
        </button>

        {!isValid && (
          <p className="text-xs text-center text-gray-400">
            ※ コンディションと昨日の歩数を選択してください
          </p>
        )}
      </div>
    </div>
  );
}
