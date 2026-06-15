import { useEffect, useState } from 'react';
import { getDailyLogs } from '../api/dailyLogs';
import { conditionLabel } from '../constants/condition';
import { formatDateOnly, formatDateTimeFull } from '../utils/date';

const STEPS_LABEL: Record<string, string> = {
  under_2000: '2,000歩未満',
  '2000_4000': '2,000〜4,000歩',
  '4000_6000': '4,000〜6,000歩',
  '6000_8000': '6,000〜8,000歩',
  over_8000: '8,000歩以上',
};

const STATUS_STYLE: Record<string, { label: string; color: string }> = {
  unchecked: { label: '未確認', color: 'bg-yellow-100 text-yellow-700' },
  checked:   { label: '確認済', color: 'bg-primary-light text-primary-dark' },
  responded: { label: '対応済', color: 'bg-green-100 text-green-700' },
};

export default function HistoryPage() {
  const [logs, setLogs]           = useState<any[]>([]);
  const [from, setFrom]           = useState('');
  const [to, setTo]               = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await getDailyLogs({ from: from || undefined, to: to || undefined });
      setLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  return (
    <div className="px-4 py-4 space-y-4">
      {/* 日付フィルタ */}
      <div className="bg-card rounded-2xl border border-gray-100 p-4">
        <p className="text-xs font-medium text-gray-500 mb-3">期間で絞り込む</p>
        <div className="flex gap-2 items-center">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <span className="text-gray-400 text-sm">〜</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={fetchLogs}
            className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            検索
          </button>
        </div>
      </div>

      {/* 一覧 */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <svg className="animate-spin h-6 w-6 text-primary" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm">記録がありません</div>
      ) : (
        <div className="bg-card rounded-2xl border border-gray-100 overflow-hidden">
          {logs.map((log, i) => (
            <button
              key={log.id}
              onClick={() => setSelectedLog(log)}
              className={`w-full flex items-center justify-between px-4 py-3 hover:bg-background transition-colors text-left
                ${i !== logs.length - 1 ? 'border-b border-gray-50' : ''}`}
            >
              <div>
                <p className="text-xs text-gray-400">{formatDateOnly(log.logged_at)}</p>
                <p className="text-sm font-medium text-text-main mt-0.5">
                  {conditionLabel(log.condition)} ／ 睡眠 {log.sleep_quality}/10
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {STEPS_LABEL[log.steps_yesterday] ?? log.steps_yesterday}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[log.status]?.color}`}>
                  {STATUS_STYLE[log.status]?.label}
                </span>
                <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* 詳細モーダル */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 px-4 pb-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-text-main">
                {formatDateTimeFull(selectedLog.logged_at)}
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3">
              {[
                { label: 'コンディション', value: conditionLabel(selectedLog.condition) },
                { label: '構ってスコア',   value: `${selectedLog.attention_score}/10` },
                { label: '食欲',          value: `${selectedLog.appetite_score}/10` },
                { label: '怠さ',      value: `${selectedLog.fever_score}/10` },
                { label: 'ぐっすり度',    value: `${selectedLog.sleep_quality}/10` },
                { label: '昨日の歩数',    value: STEPS_LABEL[selectedLog.steps_yesterday] ?? selectedLog.steps_yesterday },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center py-1.5 border-b border-gray-50">
                  <span className="text-sm text-gray-500">{label}</span>
                  <span className="text-sm font-medium text-text-main">{value}</span>
                </div>
              ))}
              {selectedLog.note && (
                <div className="pt-1">
                  <p className="text-xs text-gray-500 mb-1">メモ</p>
                  <p className="text-sm text-text-main bg-background rounded-xl p-3">{selectedLog.note}</p>
                </div>
              )}
              <div className="flex justify-between items-center pt-1">
                <span className="text-sm text-gray-500">ステータス</span>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLE[selectedLog.status]?.color}`}>
                  {STATUS_STYLE[selectedLog.status]?.label}
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedLog(null)}
              className="mt-5 w-full py-3 bg-background hover:bg-gray-200 text-text-main font-medium rounded-xl text-sm transition-colors"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
