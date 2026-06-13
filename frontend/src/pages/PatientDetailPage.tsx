import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getPatient, getPatientLogs, getPatientConsultations } from '../api/patients';
import { updateLogStatus, getNotes, createNote } from '../api/dailyLogs';
import { summarizeConsultation, getConsultation } from '../api/consultations';
import { conditionLabel } from '../constants/condition';
import { formatDateTime, formatDateTimeFull } from '../utils/date';

const RISK_STYLE: Record<string, { label: string; color: string }> = {
  low:    { label: '低リスク', color: 'bg-green-100 text-green-700' },
  medium: { label: '中リスク', color: 'bg-yellow-100 text-yellow-700' },
  high:   { label: '高リスク', color: 'bg-red-100 text-red-700' },
};

const STATUS_OPTIONS = [
  { value: 'unchecked', label: '未確認' },
  { value: 'checked',   label: '確認済' },
  { value: 'responded', label: '対応済' },
];

const STEPS_LABEL: Record<string, string> = {
  under_2000:  '2,000歩未満',
  '2000_4000': '2,000〜4,000歩',
  '4000_6000': '4,000〜6,000歩',
  '6000_8000': '6,000〜8,000歩',
  over_8000:   '8,000歩以上',
};

type TabType = 'logs' | 'consultations' | 'notes';

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [patient, setPatient]             = useState<any>(null);
  const [logs, setLogs]                   = useState<any[]>([]);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [allNotes, setAllNotes]           = useState<any[]>([]);
  const [tab, setTab]                     = useState<TabType>('logs');
  const [isLoading, setIsLoading]         = useState(true);

  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [noteInput, setNoteInput]         = useState('');
  const [isSavingNote, setIsSavingNote]   = useState(false);

  const [summarizing, setSummarizing] = useState<string | null>(null);
  const [chatModal, setChatModal]     = useState<any | null>(null);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    Promise.all([getPatient(id), getPatientLogs(id), getPatientConsultations(id)])
      .then(([p, l, c]) => { setPatient(p); setLogs(l); setConsultations(c); })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [id]);

  useEffect(() => {
    if (tab !== 'notes' || logs.length === 0) return;
    Promise.all(logs.map((log) => getNotes(log.id)))
      .then((results) => {
        const flat = results.flat().sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        setAllNotes(flat);
      })
      .catch(console.error);
  }, [tab, logs]);

  const handleStatusChange = async (logId: string, status: string) => {
    try {
      const updated = await updateLogStatus(logId, status as any);
      setLogs((prev) => prev.map((l) => l.id === logId ? { ...l, status: updated.status } : l));
    } catch (e) { console.error(e); }
  };

  const handleAddNote = async (logId: string) => {
    if (!noteInput.trim()) return;
    setIsSavingNote(true);
    try {
      await createNote(logId, noteInput.trim());
      setNoteInput('');
      setSelectedLogId(null);
    } catch (e) { console.error(e); }
    finally { setIsSavingNote(false); }
  };

  const handleSummarize = async (consultationId: string) => {
    setSummarizing(consultationId);
    try {
      const result = await summarizeConsultation(consultationId);
      setConsultations((prev) =>
        prev.map((c) => c.id === consultationId
          ? { ...c, summary: result.summary, risk_level: result.risk_level }
          : c
        )
      );
    } catch (e) { console.error(e); }
    finally { setSummarizing(null); }
  };

  const handleViewChat = async (consultationId: string) => {
    try {
      const detail = await getConsultation(consultationId);
      setChatModal(detail);
    } catch (e) { console.error(e); }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <svg className="animate-spin h-6 w-6 text-primary" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
    );
  }

  if (!patient) return null;

  return (
    <div className="p-8">
      <div className="max-w-5xl">

        {/* 患者ヘッダー */}
        <div className="bg-card rounded-2xl border border-gray-100 shadow-sm p-6 mb-6 flex items-center gap-5">
          <div className="w-16 h-16 bg-primary-light rounded-full flex items-center justify-center text-primary font-bold text-2xl flex-shrink-0">
            {(patient.name ?? patient.username)?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-text-main">{patient.name ?? patient.username}</h1>
              {patient.latest_risk_level && (
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${RISK_STYLE[patient.latest_risk_level]?.color}`}>
                  {RISK_STYLE[patient.latest_risk_level]?.label}
                </span>
              )}
            </div>
            {patient.position && (
              <p className="text-sm text-gray-500">{patient.position}</p>
            )}
            {patient.organization_name && (
              <p className="text-xs text-gray-400 mt-0.5">{patient.organization_name}</p>
            )}
          </div>
        </div>

        {/* タブ */}
        <div className="flex gap-1 mb-5 bg-card rounded-xl border border-gray-100 p-1 w-fit">
          {([
            { key: 'logs',          label: '体調履歴' },
            { key: 'consultations', label: 'AI相談' },
            { key: 'notes',         label: 'メモ' },
          ] as { key: TabType; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors
                ${tab === key ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-text-main'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 体調履歴タブ */}
        {tab === 'logs' && (
          <div className="bg-card rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {logs.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">記録がありません</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-max">
                  <thead className="bg-background border-b border-gray-100">
                    <tr>
                      {['日時', 'コンディション', '構ってスコア', '食欲', '熱っぽさ', '歩数', 'ぐっすり度', 'ステータス', '操作'].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log, i) => (
                      <>
                        <tr
                          key={log.id}
                          onClick={() => setSelectedLogId(selectedLogId === log.id ? null : log.id)}
                          className={`cursor-pointer hover:bg-background transition-colors
                            ${i !== logs.length - 1 ? 'border-b border-gray-50' : ''}`}
                        >
                          <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                            {formatDateTime(log.logged_at)}
                          </td>
                          <td className="px-4 py-3 text-sm whitespace-nowrap">{conditionLabel(log.condition)}</td>
                          <td className="px-4 py-3 text-sm text-center">{log.attention_score}/10</td>
                          <td className="px-4 py-3 text-sm text-center">{log.appetite_score}/10</td>
                          <td className="px-4 py-3 text-sm text-center">{log.fever_score}/10</td>
                          <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{STEPS_LABEL[log.steps_yesterday] ?? log.steps_yesterday}</td>
                          <td className="px-4 py-3 text-sm text-center">{log.sleep_quality}/10</td>
                          <td className="px-4 py-3">
                            <select
                              value={log.status}
                              onChange={(e) => { e.stopPropagation(); handleStatusChange(log.id, e.target.value); }}
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                              {STATUS_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <button className="text-xs text-primary hover:underline whitespace-nowrap">
                              {selectedLogId === log.id ? '閉じる' : 'メモ'}
                            </button>
                          </td>
                        </tr>
                        {selectedLogId === log.id && (
                          <tr key={`${log.id}-note`} className="bg-primary-light border-b border-gray-100">
                            <td colSpan={9} className="px-4 py-3">
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={noteInput}
                                  onChange={(e) => setNoteInput(e.target.value)}
                                  placeholder="メモを入力..."
                                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddNote(log.id); }}
                                />
                                <button
                                  onClick={() => handleAddNote(log.id)}
                                  disabled={isSavingNote || !noteInput.trim()}
                                  className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-60"
                                >
                                  追加
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* AI相談タブ */}
        {tab === 'consultations' && (
          <div className="space-y-3">
            {consultations.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm bg-card rounded-2xl border border-gray-100">相談履歴がありません</div>
            ) : consultations.map((c) => (
              <div key={c.id} className="bg-card rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">{formatDateTimeFull(c.started_at)}</p>
                    {c.topic_label && <span className="text-xs text-accent font-medium">#{c.topic_label}</span>}
                  </div>
                  {c.risk_level && (
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${RISK_STYLE[c.risk_level]?.color}`}>
                      {RISK_STYLE[c.risk_level]?.label}
                    </span>
                  )}
                </div>
                {c.summary ? (
                  <p className="text-sm text-text-main bg-background rounded-xl p-3 mb-3">{c.summary}</p>
                ) : (
                  <p className="text-sm text-gray-400 mb-3">（要約なし）</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSummarize(c.id)}
                    disabled={summarizing === c.id}
                    className="px-4 py-2 text-xs font-medium bg-background border border-gray-200 rounded-xl hover:border-primary hover:text-primary transition-colors disabled:opacity-60 flex items-center gap-1.5"
                  >
                    {summarizing === c.id ? (
                      <>
                        <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        生成中...
                      </>
                    ) : '要約を生成'}
                  </button>
                  <button
                    onClick={() => handleViewChat(c.id)}
                    className="px-4 py-2 text-xs font-medium bg-background border border-gray-200 rounded-xl hover:border-primary hover:text-primary transition-colors"
                  >
                    会話ログを見る
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* メモタブ */}
        {tab === 'notes' && (
          <div className="bg-card rounded-2xl border border-gray-100 shadow-sm p-5">
            {allNotes.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">メモがありません</div>
            ) : (
              <div className="space-y-4">
                {allNotes.map((note) => (
                  <div key={note.id} className="flex gap-3 pb-4 border-b border-gray-50 last:border-0">
                    <div className="w-8 h-8 bg-primary-light rounded-full flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                      {(note.provider_name ?? note.provider_username)?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-text-main">{note.provider_name ?? note.provider_username}</span>
                        <span className="text-xs text-gray-400">{formatDateTimeFull(note.created_at)}</span>
                      </div>
                      <p className="text-sm text-text-main bg-background rounded-xl px-3 py-2">{note.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 会話ログモーダル */}
      {chatModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-text-main">会話ログ</h3>
              <button onClick={() => setChatModal(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {(chatModal.messages ?? []).map((msg: any) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm
                    ${msg.role === 'user'
                      ? 'bg-primary text-white rounded-br-sm'
                      : 'bg-background text-text-main border border-gray-100 rounded-bl-sm'
                    }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 py-4 border-t border-gray-100">
              <button
                onClick={() => setChatModal(null)}
                className="w-full py-2.5 bg-background hover:bg-gray-200 text-text-main font-medium rounded-xl text-sm transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
