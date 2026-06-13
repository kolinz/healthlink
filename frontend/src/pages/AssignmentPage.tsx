import { useEffect, useState } from 'react';
import { getAssignments, createAssignment, deleteAssignment, getUsers } from '../api/admin';
import { useLabels } from '../hooks/useLabels';

const ROLE_COLOR: Record<string, string> = {
  patient: 'bg-blue-100 text-blue-700',
  doctor:  'bg-purple-100 text-purple-700',
  nurse:   'bg-pink-100 text-pink-700',
  admin:   'bg-gray-100 text-gray-700',
};

export default function AssignmentPage() {
  const labels = useLabels();

  const [assignments, setAssignments] = useState<any[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [showAdd, setShowAdd]         = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [isDeleting, setIsDeleting]   = useState(false);

  // 追加モーダル用
  const [patients, setPatients]   = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [patientId, setPatientId] = useState('');
  const [providerId, setProviderId] = useState('');
  const [isAdding, setIsAdding]   = useState(false);

  const roleLabel = (role: string) => {
    if (role === 'patient') return labels.patient;
    if (role === 'doctor')  return labels.doctor;
    if (role === 'nurse')   return labels.nurse;
    return labels.admin;
  };

  const fetchAssignments = () => {
    setIsLoading(true);
    getAssignments()
      .then(setAssignments)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { fetchAssignments(); }, []);

  const handleOpenAdd = async () => {
    try {
      const [pts, pvs] = await Promise.all([
        getUsers({ role: 'patient' }),
        getUsers({ role: 'doctor' }).then(async (d) => {
          const n = await getUsers({ role: 'nurse' });
          return [...d, ...n];
        }),
      ]);
      setPatients(pts);
      setProviders(pvs);
      setPatientId(pts[0]?.id ?? '');
      setProviderId(pvs[0]?.id ?? '');
      setShowAdd(true);
    } catch (e) { console.error(e); }
  };

  const handleAdd = async () => {
    if (!patientId || !providerId) return;
    setIsAdding(true);
    try {
      await createAssignment({ patient_id: patientId, provider_id: providerId });
      setShowAdd(false);
      fetchAssignments();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? '追加に失敗しました');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteAssignment(deleteTarget.id);
      setDeleteTarget(null);
      fetchAssignments();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? '解除に失敗しました');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-text-main">担当割当</h1>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            ＋ 割当追加
          </button>
        </div>

        <div className="bg-card rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <svg className="animate-spin h-6 w-6 text-primary" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
            </div>
          ) : assignments.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">割当がありません</div>
          ) : (
            <table className="w-full">
              <thead className="bg-background border-b border-gray-100">
                <tr>
                  {[`${labels.patient}名`, '担当者名', 'ロール', '割当日', '操作'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {assignments.map((a, i) => (
                  <tr key={a.id} className={`${i !== assignments.length - 1 ? 'border-b border-gray-50' : ''}`}>
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-text-main">{a.patient_name ?? a.patient_username}</p>
                      <p className="text-xs text-gray-400">{a.patient_username}</p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-text-main">{a.provider_name ?? a.provider_username}</p>
                      <p className="text-xs text-gray-400">{a.provider_username}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ROLE_COLOR[a.provider_role]}`}>
                        {roleLabel(a.provider_role)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">
                      {new Date(a.assigned_at).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => setDeleteTarget(a)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        解除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 割当追加モーダル */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-base font-semibold text-text-main mb-4">割当追加</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">{labels.patient}</label>
                <select
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>{p.name ?? p.username} ({p.username})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">担当者（{labels.doctor}/{labels.nurse}）</label>
                <select
                  value={providerId}
                  onChange={(e) => setProviderId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>{p.name ?? p.username} ({roleLabel(p.role)})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setShowAdd(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleAdd}
                disabled={isAdding || !patientId || !providerId}
                className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark disabled:opacity-60"
              >
                {isAdding ? '追加中...' : '追加'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 解除確認モーダル */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-base font-semibold text-text-main mb-2">割当を解除しますか？</h3>
            <p className="text-sm text-gray-600 mb-5">
              <span className="font-medium">{deleteTarget.patient_name ?? deleteTarget.patient_username}</span> と{' '}
              <span className="font-medium">{deleteTarget.provider_name ?? deleteTarget.provider_username}</span> の割当を解除します。
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-60"
              >
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium disabled:opacity-60"
              >
                {isDeleting ? '解除中...' : '解除する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
