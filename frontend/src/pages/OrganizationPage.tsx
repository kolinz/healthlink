import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOrganizations, createOrganization, updateOrganization } from '../api/admin';

export default function OrganizationPage() {
  const navigate = useNavigate();
  const [orgs, setOrgs]           = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editOrg, setEditOrg]     = useState<any | null>(null);
  const [form, setForm]           = useState({ name: '', code: '' });
  const [editForm, setEditForm]   = useState({ name: '', code: '', is_active: 1 });

  const fetchOrgs = () => {
    setIsLoading(true);
    getOrganizations().then(setOrgs).catch(console.error).finally(() => setIsLoading(false));
  };

  useEffect(() => { fetchOrgs(); }, []);

  const handleCreate = async () => {
    try {
      await createOrganization(form);
      setShowCreate(false);
      setForm({ name: '', code: '' });
      fetchOrgs();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? '作成に失敗しました');
    }
  };

  const handleUpdate = async () => {
    if (!editOrg) return;
    try {
      await updateOrganization(editOrg.id, editForm);
      setEditOrg(null);
      fetchOrgs();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? '更新に失敗しました');
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-text-main">組織管理</h1>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            ＋ 組織追加
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
          ) : (
            <table className="w-full">
              <thead className="bg-background border-b border-gray-100">
                <tr>
                  {['組織名', '施設コード', 'ステータス', '操作'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orgs.map((org, i) => (
                  <tr key={org.id} className={`${i !== orgs.length - 1 ? 'border-b border-gray-50' : ''}`}>
                    <td className="px-5 py-3 text-sm font-medium text-text-main">{org.name}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">{org.code ?? '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${org.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {org.is_active ? '有効' : '無効'}
                      </span>
                    </td>
                    <td className="px-5 py-3 flex gap-3">
                      <button
                        onClick={() => navigate(`/admin/organizations/${org.id}/members`)}
                        className="text-xs text-accent hover:underline"
                      >
                        メンバー管理
                      </button>
                      <button
                        onClick={() => { setEditOrg(org); setEditForm({ name: org.name, code: org.code ?? '', is_active: org.is_active }); }}
                        className="text-xs text-primary hover:underline"
                      >
                        編集
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 作成モーダル */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-base font-semibold text-text-main mb-4">組織作成</h3>
            <div className="space-y-3">
              <input type="text" placeholder="組織名 *" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              <input type="text" placeholder="施設コード（例: HOSP001）" value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowCreate(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                キャンセル
              </button>
              <button onClick={handleCreate}
                className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark">
                作成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 編集モーダル */}
      {editOrg && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-base font-semibold text-text-main mb-4">組織編集</h3>
            <div className="space-y-3">
              <input type="text" placeholder="組織名 *" value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              <input type="text" placeholder="施設コード" value={editForm.code}
                onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              <select value={editForm.is_active} onChange={(e) => setEditForm({ ...editForm, is_active: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                <option value={1}>有効</option>
                <option value={0}>無効</option>
              </select>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setEditOrg(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                キャンセル
              </button>
              <button onClick={handleUpdate}
                className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark">
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
