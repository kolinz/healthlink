import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOrganizations, getOrgMembers, removeOrgMember, getUsers, addOrgMember } from '../api/admin';
import { useLabels } from '../hooks/useLabels';

const ROLE_COLOR: Record<string, string> = {
  patient: 'bg-blue-100 text-blue-700',
  doctor:  'bg-purple-100 text-purple-700',
  nurse:   'bg-pink-100 text-pink-700',
  admin:   'bg-gray-100 text-gray-700',
};

export default function AdminMembersPage() {
  const navigate = useNavigate();
  const labels = useLabels();

  const [members, setMembers]     = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [isDeleting, setIsDeleting]     = useState(false);

  // メンバー追加モーダル
  const [showAdd, setShowAdd]         = useState(false);
  const [orgs, setOrgs]               = useState<any[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [userSearch, setUserSearch]   = useState('');
  const [userResults, setUserResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding]       = useState(false);

  const roleLabel = (role: string) => {
    if (role === 'patient') return labels.patient;
    if (role === 'doctor')  return labels.doctor;
    if (role === 'nurse')   return labels.nurse;
    return labels.admin;
  };

  const fetchAllMembers = async () => {
    setIsLoading(true);
    try {
      const organizations = await getOrganizations();
      setOrgs(organizations);
      if (selectedOrgId === '' && organizations.length > 0) {
        setSelectedOrgId(organizations[0].id);
      }

      // 全組織のメンバーを取得して組織名を付与
      const results = await Promise.all(
        organizations.map(async (org: any) => {
          const orgMembers = await getOrgMembers(org.id);
          return orgMembers.map((m: any) => ({
            ...m,
            organization_id:   org.id,
            organization_name: org.name,
          }));
        })
      );
      setMembers(results.flat());
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchAllMembers(); }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await removeOrgMember(deleteTarget.organization_id, deleteTarget.id);
      setDeleteTarget(null);
      fetchAllMembers();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? '削除に失敗しました');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSearch = async () => {
    if (!userSearch.trim()) return;
    setIsSearching(true);
    try {
      const results = await getUsers({ search: userSearch });
      // 選択中の組織に既に所属しているメンバーを除外
      const memberIds = new Set(
        members.filter((m) => m.organization_id === selectedOrgId).map((m) => m.id)
      );
      setUserResults(results.filter((u: any) => !memberIds.has(u.id)));
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAdd = async (userId: string) => {
    if (!selectedOrgId) return;
    setIsAdding(true);
    try {
      await addOrgMember(selectedOrgId, userId);
      setShowAdd(false);
      setUserSearch('');
      setUserResults([]);
      fetchAllMembers();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? '追加に失敗しました');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text-main">メンバー管理</h1>
            <p className="text-sm text-gray-500 mt-0.5">組織への所属設定がアクセス制御の実体です</p>
          </div>
          <button
            onClick={() => { setShowAdd(true); setUserSearch(''); setUserResults([]); }}
            className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            ＋ メンバー追加
          </button>
        </div>

        {/* メンバー一覧テーブル */}
        <div className="bg-card rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <svg className="animate-spin h-6 w-6 text-primary" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">メンバーがいません</div>
          ) : (
            <table className="w-full">
              <thead className="bg-background border-b border-gray-100">
                <tr>
                  {['ユーザー名/氏名', '組織', 'ロール', '所属日', '操作'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map((m, i) => (
                  <tr key={`${m.organization_id}-${m.id}`}
                    className={`${i !== members.length - 1 ? 'border-b border-gray-50' : ''}`}>
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-text-main">{m.username}</p>
                      {m.name && <p className="text-xs text-gray-400">{m.name}</p>}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">{m.organization_name}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ROLE_COLOR[m.role]}`}>
                        {roleLabel(m.role)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">
                      {new Date(m.assigned_at).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => setDeleteTarget(m)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 削除確認モーダル */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-base font-semibold text-text-main mb-2">メンバーを削除しますか？</h3>
            <p className="text-sm text-gray-600 mb-1">
              <span className="font-medium">{deleteTarget.name ?? deleteTarget.username}</span> を
              <span className="font-medium">「{deleteTarget.organization_name}」</span>から削除します。
            </p>
            <p className="text-xs text-gray-400 mb-5">この操作によりアクセス権限が変更されます。</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)} disabled={isDeleting}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-60">
                キャンセル
              </button>
              <button onClick={handleDelete} disabled={isDeleting}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2">
                {isDeleting ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                ) : '削除する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* メンバー追加モーダル */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-base font-semibold text-text-main mb-4">メンバー追加</h3>
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">追加先の組織</label>
                <select
                  value={selectedOrgId}
                  onChange={(e) => { setSelectedOrgId(e.target.value); setUserResults([]); }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {orgs.map((org) => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="ユーザー名・氏名で検索"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button onClick={handleSearch} disabled={isSearching}
                  className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark disabled:opacity-60">
                  検索
                </button>
              </div>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
              {userResults.length === 0 && userSearch && !isSearching && (
                <p className="text-center text-sm text-gray-400 py-4">該当するユーザーがいません</p>
              )}
              {userResults.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-3 bg-background rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-text-main">{u.username}</p>
                    {u.name && <p className="text-xs text-gray-400">{u.name}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_COLOR[u.role]}`}>
                      {roleLabel(u.role)}
                    </span>
                    <button onClick={() => handleAdd(u.id)} disabled={isAdding}
                      className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary-dark disabled:opacity-60">
                      追加
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => { setShowAdd(false); setUserSearch(''); setUserResults([]); }}
              className="w-full py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
