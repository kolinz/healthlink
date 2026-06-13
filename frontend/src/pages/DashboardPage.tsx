import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPatients } from '../api/patients';
import { useLabels } from '../hooks/useLabels';
import { formatDateTime } from '../utils/date';

const RISK_STYLE: Record<string, { label: string; color: string }> = {
  low:    { label: '低',  color: 'bg-green-100 text-green-700' },
  medium: { label: '中',  color: 'bg-yellow-100 text-yellow-700' },
  high:   { label: '高',  color: 'bg-red-100 text-red-700' },
};

const STATUS_STYLE: Record<string, { label: string; color: string }> = {
  unchecked: { label: '未確認', color: 'bg-yellow-100 text-yellow-700' },
  checked:   { label: '確認済', color: 'bg-primary-light text-primary-dark' },
  responded: { label: '対応済', color: 'bg-green-100 text-green-700' },
};

type FilterType = 'all' | 'unchecked' | 'high';

export default function DashboardPage() {
  const navigate = useNavigate();
  const labels = useLabels();

  const [patients, setPatients]   = useState<any[]>([]);
  const [filter, setFilter]       = useState<FilterType>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getPatients()
      .then(setPatients)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const totalCount     = patients.length;
  const uncheckedCount = patients.filter((p) => p.latest_status === 'unchecked').length;
  const highRiskCount  = patients.filter((p) => p.latest_risk_level === 'high').length;

  const filtered = patients.filter((p) => {
    if (filter === 'unchecked') return p.latest_status === 'unchecked';
    if (filter === 'high')      return p.latest_risk_level === 'high';
    return true;
  });

  return (
    <div className="p-8">
      <div className="max-w-5xl">
        <h1 className="text-2xl font-bold text-text-main mb-6">ダッシュボード</h1>

        {/* サマリーカード */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: `${labels.patient}数`,  value: totalCount,     color: 'text-primary' },
            { label: '未確認件数',            value: uncheckedCount, color: 'text-yellow-600' },
            { label: '高リスク件数',          value: highRiskCount,  color: 'text-red-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-card rounded-2xl border border-gray-100 p-5 shadow-sm">
              <p className="text-sm text-gray-500 mb-1">{label}</p>
              <p className={`text-3xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* フィルタタブ */}
        <div className="flex gap-2 mb-4">
          {([
            { key: 'all',       label: '全て' },
            { key: 'unchecked', label: '未確認' },
            { key: 'high',      label: '高リスク' },
          ] as { key: FilterType; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors
                ${filter === key
                  ? 'bg-primary text-white'
                  : 'bg-card text-gray-500 border border-gray-200 hover:border-primary'
                }`}
            >
              {label}
              {key === 'unchecked' && uncheckedCount > 0 && (
                <span className="ml-1.5 bg-yellow-400 text-white text-xs rounded-full px-1.5 py-0.5">
                  {uncheckedCount}
                </span>
              )}
              {key === 'high' && highRiskCount > 0 && (
                <span className="ml-1.5 bg-red-400 text-white text-xs rounded-full px-1.5 py-0.5">
                  {highRiskCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* 患者一覧テーブル */}
        <div className="bg-card rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <svg className="animate-spin h-6 w-6 text-primary" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              該当する{labels.patient}がいません
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-background border-b border-gray-100">
                <tr>
                  {[`${labels.patient}名`, '所属組織', '最終記録', '危険度', 'ステータス'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/patients/${p.id}`)}
                    className={`cursor-pointer hover:bg-background transition-colors
                      ${i !== filtered.length - 1 ? 'border-b border-gray-50' : ''}`}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-primary-light rounded-full flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                          {(p.name ?? p.username)?.[0]?.toUpperCase() ?? '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-text-main">{p.name ?? p.username}</p>
                          {p.position && (
                            <p className="text-xs text-gray-400">{p.position}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500">
                      {p.organization_name ?? '—'}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500">
                      {p.last_logged_at ? formatDateTime(p.last_logged_at) : '記録なし'}
                    </td>
                    <td className="px-5 py-4">
                      {p.latest_risk_level ? (
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${RISK_STYLE[p.latest_risk_level]?.color}`}>
                          {RISK_STYLE[p.latest_risk_level]?.label}
                        </span>
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-4">
                      {p.latest_status ? (
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLE[p.latest_status]?.color}`}>
                          {STATUS_STYLE[p.latest_status]?.label}
                        </span>
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
