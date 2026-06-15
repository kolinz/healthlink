import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPatients, getPatientLogs } from '../api/patients';
import { useLabels } from '../hooks/useLabels';
import { formatDateTime } from '../utils/date';
import { exportDailyLogsCsv } from '../utils/csv';

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

type TabFilterType = 'all' | 'unchecked' | 'high';

export default function DashboardPage() {
  const navigate = useNavigate();
  const labels = useLabels();

  const [patients, setPatients]         = useState<any[]>([]);
  const [tabFilter, setTabFilter]       = useState<TabFilterType>('all');
  const [isLoading, setIsLoading]       = useState(true);
  const [isExporting, setIsExporting]   = useState(false);
  const [exportTarget, setExportTarget] = useState<any | null>(null);

  // フィルター
  const [searchName, setSearchName]   = useState('');
  const [searchOrg, setSearchOrg]     = useState('');
  const [searchStatus, setSearchStatus] = useState('');

  useEffect(() => {
    getPatients()
      .then(setPatients)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  // 所属組織の一覧（重複除去）
  const orgOptions = useMemo(() => {
    const orgs = patients.map((p) => p.organization_name).filter(Boolean);
    return [...new Set(orgs)];
  }, [patients]);

  // タブフィルター + 検索フィルターを合成
  const filtered = useMemo(() => {
    return patients.filter((p) => {
      // タブフィルター
      if (tabFilter === 'unchecked' && p.latest_status !== 'unchecked') return false;
      if (tabFilter === 'high' && p.latest_risk_level !== 'high') return false;

      // 患者名フィルター
      if (searchName) {
        const name = (p.name ?? p.username ?? '').toLowerCase();
        if (!name.includes(searchName.toLowerCase())) return false;
      }

      // 所属組織フィルター
      if (searchOrg && p.organization_name !== searchOrg) return false;

      // ステータスフィルター
      if (searchStatus && p.latest_status !== searchStatus) return false;

      return true;
    });
  }, [patients, tabFilter, searchName, searchOrg, searchStatus]);

  const totalCount     = patients.length;
  const uncheckedCount = patients.filter((p) => p.latest_status === 'unchecked').length;
  const highRiskCount  = patients.filter((p) => p.latest_risk_level === 'high').length;

  const hasFilter = searchName || searchOrg || searchStatus;

  const handleClearFilter = () => {
    setSearchName('');
    setSearchOrg('');
    setSearchStatus('');
  };

  // 全患者CSV
  const handleExportAll = async () => {
    setIsExporting(true);
    setExportTarget(null);
    try {
      const allLogs: any[] = [];
      for (const patient of patients) {
        const logs = await getPatientLogs(patient.id);
        logs.forEach((log: any) => {
          allLogs.push({ ...log, patient_name: patient.name, patient_username: patient.username });
        });
      }
      allLogs.sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime());
      const today = new Date().toLocaleDateString('ja-JP', {
        timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
      }).replace(/\//g, '');
      exportDailyLogsCsv(allLogs, `体調ログ_全員_${today}.csv`);
    } catch (e) {
      console.error(e);
      alert('エクスポートに失敗しました');
    } finally {
      setIsExporting(false);
    }
  };

  // 選択患者CSV
  const handleExportPatient = async (patient: any) => {
    setIsExporting(true);
    setExportTarget(patient.id);
    try {
      const logs = await getPatientLogs(patient.id);
      const logsWithName = logs.map((log: any) => ({
        ...log, patient_name: patient.name, patient_username: patient.username,
      }));
      const today = new Date().toLocaleDateString('ja-JP', {
        timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
      }).replace(/\//g, '');
      exportDailyLogsCsv(logsWithName, `体調ログ_${patient.name ?? patient.username}_${today}.csv`);
    } catch (e) {
      console.error(e);
      alert('エクスポートに失敗しました');
    } finally {
      setIsExporting(false);
      setExportTarget(null);
    }
  };

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

        {/* タブフィルター + 全員CSVボタン */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-2">
            {([
              { key: 'all',       label: '全て' },
              { key: 'unchecked', label: '未確認' },
              { key: 'high',      label: '高リスク' },
            ] as { key: TabFilterType; label: string }[]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTabFilter(key)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors
                  ${tabFilter === key
                    ? 'bg-primary text-white'
                    : 'bg-card text-gray-500 border border-gray-200 hover:border-primary'
                  }`}
              >
                {label}
                {key === 'unchecked' && uncheckedCount > 0 && (
                  <span className="ml-1.5 bg-yellow-400 text-white text-xs rounded-full px-1.5 py-0.5">{uncheckedCount}</span>
                )}
                {key === 'high' && highRiskCount > 0 && (
                  <span className="ml-1.5 bg-red-400 text-white text-xs rounded-full px-1.5 py-0.5">{highRiskCount}</span>
                )}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportAll}
            disabled={isExporting || patients.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
          >
            {isExporting && exportTarget === null ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                エクスポート中...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                全員CSV
              </>
            )}
          </button>
        </div>

        {/* 検索フィルター */}
        <div className="bg-card rounded-2xl border border-gray-100 p-4 mb-4 flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-36">
            <label className="text-xs font-medium text-gray-500 mb-1 block">{labels.patient}名</label>
            <input
              type="text"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder="氏名・ユーザー名"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex-1 min-w-36">
            <label className="text-xs font-medium text-gray-500 mb-1 block">所属組織</label>
            <select
              value={searchOrg}
              onChange={(e) => setSearchOrg(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">すべて</option>
              {orgOptions.map((org) => (
                <option key={org} value={org}>{org}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-36">
            <label className="text-xs font-medium text-gray-500 mb-1 block">ステータス</label>
            <select
              value={searchStatus}
              onChange={(e) => setSearchStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">すべて</option>
              <option value="unchecked">未確認</option>
              <option value="checked">確認済</option>
              <option value="responded">対応済</option>
            </select>
          </div>
          {hasFilter && (
            <button
              onClick={handleClearFilter}
              className="px-4 py-2 text-sm text-gray-400 hover:text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              クリア
            </button>
          )}
        </div>

        {/* 検索結果件数 */}
        {hasFilter && (
          <p className="text-xs text-gray-400 mb-2">
            {filtered.length} 件表示中（全 {totalCount} 件）
          </p>
        )}

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
                  {[`${labels.patient}名`, '所属組織', '最終記録', '危険度', 'ステータス', 'CSV'].map((h) => (
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
                    className={`hover:bg-background transition-colors ${i !== filtered.length - 1 ? 'border-b border-gray-50' : ''}`}
                  >
                    <td className="px-5 py-4 cursor-pointer" onClick={() => navigate(`/patients/${p.id}`)}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-primary-light rounded-full flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                          {(p.name ?? p.username)?.[0]?.toUpperCase() ?? '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-text-main">{p.name ?? p.username}</p>
                          {p.position && <p className="text-xs text-gray-400">{p.position}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500 cursor-pointer" onClick={() => navigate(`/patients/${p.id}`)}>
                      {p.organization_name ?? '—'}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500 cursor-pointer" onClick={() => navigate(`/patients/${p.id}`)}>
                      {p.last_logged_at ? formatDateTime(p.last_logged_at) : '記録なし'}
                    </td>
                    <td className="px-5 py-4 cursor-pointer" onClick={() => navigate(`/patients/${p.id}`)}>
                      {p.latest_risk_level ? (
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${RISK_STYLE[p.latest_risk_level]?.color}`}>
                          {RISK_STYLE[p.latest_risk_level]?.label}
                        </span>
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-4 cursor-pointer" onClick={() => navigate(`/patients/${p.id}`)}>
                      {p.latest_status ? (
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLE[p.latest_status]?.color}`}>
                          {STATUS_STYLE[p.latest_status]?.label}
                        </span>
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => handleExportPatient(p)}
                        disabled={isExporting}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary transition-colors disabled:opacity-40"
                      >
                        {isExporting && exportTarget === p.id ? (
                          <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        )}
                        CSV
                      </button>
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
