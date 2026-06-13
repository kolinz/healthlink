import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getConsultations, startConsultation, getTopics } from '../api/consultations';
import { formatDateTimeFull } from '../utils/date';

const RISK_STYLE: Record<string, { label: string; color: string }> = {
  low:    { label: '低リスク', color: 'bg-green-100 text-green-700' },
  medium: { label: '中リスク', color: 'bg-yellow-100 text-yellow-700' },
  high:   { label: '高リスク', color: 'bg-red-100 text-red-700' },
};

function topicEmoji(icon: string): string {
  const map: Record<string, string> = {
    'ti-thermometer': '🌡️',
    'ti-heart':       '💚',
    'ti-book':        '📚',
    'ti-dots':        '💬',
  };
  return map[icon] ?? '💬';
}

export default function ConsultationListPage() {
  const navigate = useNavigate();
  const [consultations, setConsultations] = useState<any[]>([]);
  const [topics, setTopics]               = useState<any[]>([]);
  const [showSheet, setShowSheet]         = useState(false);
  const [isStarting, setIsStarting]       = useState(false);
  const [isLoading, setIsLoading]         = useState(false);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([getConsultations(), getTopics()])
      .then(([c, t]) => { setConsultations(c); setTopics(t); })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const handleStart = async (topicId?: string) => {
    if (isStarting) return;
    setIsStarting(true);
    try {
      const consultation = await startConsultation(topicId);
      setShowSheet(false);
      navigate(`/consultations/${consultation.id}`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="px-4 py-4 space-y-3">
      {isLoading ? (
        <div className="flex justify-center py-10">
          <svg className="animate-spin h-6 w-6 text-primary" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
      ) : consultations.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-accent-light rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <p className="text-gray-400 text-sm">まだ相談履歴がありません</p>
          <p className="text-gray-400 text-xs mt-1">右下の＋ボタンから相談を始めましょう</p>
        </div>
      ) : (
        consultations.map((c) => (
          <button
            key={c.id}
            onClick={() => navigate(`/consultations/${c.id}`)}
            className="w-full bg-card rounded-2xl border border-gray-100 p-4 text-left hover:shadow-sm transition-shadow"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-400">{formatDateTimeFull(c.started_at)}</p>
              <div className="flex items-center gap-2">
                {c.risk_level && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${RISK_STYLE[c.risk_level]?.color}`}>
                    {RISK_STYLE[c.risk_level]?.label}
                  </span>
                )}
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  {c.message_count ?? 0}
                </span>
              </div>
            </div>
            {c.topic_label && (
              <p className="text-xs text-accent font-medium mb-1">#{c.topic_label}</p>
            )}
            <p className="text-sm text-text-main line-clamp-2">
              {c.summary
                ? c.summary.slice(0, 30) + (c.summary.length > 30 ? '…' : '')
                : '（要約なし）'}
            </p>
          </button>
        ))
      )}

      {/* FAB */}
      <button
        onClick={() => setShowSheet(true)}
        className="fixed bottom-20 right-4 w-14 h-14 bg-primary hover:bg-primary-dark text-white rounded-full shadow-lg flex items-center justify-center transition-colors z-40"
      >
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* ボトムシート */}
      {showSheet && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowSheet(false)} />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 px-4 pt-4 pb-8 shadow-2xl">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <h3 className="text-base font-semibold text-text-main mb-4">相談カテゴリを選ぶ</h3>
            {topics.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mb-3">
                {topics.map((topic) => (
                  <button
                    key={topic.id}
                    onClick={() => handleStart(topic.id)}
                    disabled={isStarting}
                    className="flex items-center gap-2 p-3 bg-background rounded-xl border border-gray-100 hover:border-primary hover:bg-primary-light transition-colors text-left disabled:opacity-60"
                  >
                    <span className="text-xl">{topicEmoji(topic.icon)}</span>
                    <span className="text-sm font-medium text-text-main">{topic.label}</span>
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => handleStart(undefined)}
              disabled={isStarting}
              className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm font-medium text-gray-500 hover:border-primary hover:text-primary transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              テキストで自由に入力する
            </button>
          </div>
        </>
      )}
    </div>
  );
}
