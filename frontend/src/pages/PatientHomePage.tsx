import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { getDailyLogs } from '../api/dailyLogs';
import { conditionLabel } from '../constants/condition';
import { formatDateTimeFull, formatDateShort, parseDbDate } from '../utils/date';

const STEPS_LABEL: Record<string, string> = {
  under_2000: '2,000歩未満',
  '2000_4000': '2,000〜4,000歩',
  '4000_6000': '4,000〜6,000歩',
  '6000_8000': '6,000〜8,000歩',
  over_8000: '8,000歩以上',
};

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  unchecked: { label: '未確認', color: 'bg-yellow-100 text-yellow-700' },
  checked:   { label: '確認済', color: 'bg-primary-light text-primary-dark' },
  responded: { label: '対応済', color: 'bg-green-100 text-green-700' },
};

export default function PatientHomePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [logs, setLogs] = useState<any[]>([]);

  const today = new Date().toLocaleDateString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  });

  useEffect(() => {
    getDailyLogs()
      .then((data) => {
        const sorted = [...data].sort(
          (a, b) => (parseDbDate(b.logged_at)?.getTime() ?? 0) - (parseDbDate(a.logged_at)?.getTime() ?? 0)
        );
        setLogs(sorted);
      })
      .catch(console.error);
  }, []);

  const latestLog = logs[0] ?? null;
  const recentLogs = logs.slice(0, 3);

  return (
    <div className="pb-4">
      {/* ヘッダー */}
      <div className="bg-primary px-4 pt-6 pb-6 text-white">
        <p className="text-sm opacity-80">{today}</p>
        <h1 className="text-xl font-bold mt-1">
          こんにちは、{user?.name ?? user?.username}さん
        </h1>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        {/* 体調記録ボタン */}
        <button
          onClick={() => navigate('/logs/new')}
          className="w-full py-4 bg-primary hover:bg-primary-dark text-white font-semibold rounded-2xl shadow-md text-base transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          今日の体調を記録する
        </button>

        {/* 最新記録サマリーカード */}
        {latestLog && (
          <div className="bg-card rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-500">最新の記録</h2>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_LABEL[latestLog.status]?.color}`}>
                {STATUS_LABEL[latestLog.status]?.label}
              </span>
            </div>
            <p className="text-xs text-gray-400 mb-3">
              {formatDateTimeFull(latestLog.logged_at)}
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-2 bg-background rounded-xl">
                <p className="text-xs text-gray-500 mb-1">コンディション</p>
                <p className="text-sm font-semibold text-text-main">{conditionLabel(latestLog.condition)}</p>
              </div>
              <div className="text-center p-2 bg-background rounded-xl">
                <p className="text-xs text-gray-500 mb-1">歩数</p>
                <p className="text-xs font-semibold text-text-main">{STEPS_LABEL[latestLog.steps_yesterday] ?? latestLog.steps_yesterday}</p>
              </div>
              <div className="text-center p-2 bg-background rounded-xl">
                <p className="text-xs text-gray-500 mb-1">ぐっすり度</p>
                <p className="text-sm font-semibold text-text-main">{latestLog.sleep_quality}/10</p>
              </div>
            </div>
          </div>
        )}

        {/* AI相談CTAカード */}
        <button
          onClick={() => navigate('/consultations')}
          className="w-full bg-accent-light border border-accent rounded-2xl p-4 text-left hover:bg-accent transition-colors group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-accent-dark">AIに相談する</p>
              <p className="text-xs text-gray-500 mt-0.5">体調や薬のことを気軽に相談できます</p>
            </div>
            <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center group-hover:bg-accent-dark transition-colors">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
          </div>
        </button>

        {/* 直近3件の記録 */}
        {recentLogs.length > 0 && (
          <div className="bg-card rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-500">最近の記録</h2>
              <button onClick={() => navigate('/logs')} className="text-xs text-primary hover:underline">
                すべて見る
              </button>
            </div>
            <div className="space-y-2">
              {recentLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-xs text-gray-400">{formatDateShort(log.logged_at)}</p>
                    <p className="text-sm font-medium text-text-main mt-0.5">{conditionLabel(log.condition)}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_LABEL[log.status]?.color}`}>
                    {STATUS_LABEL[log.status]?.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
