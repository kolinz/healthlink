import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getOrganization, getOrgMembers, addOrgMember, removeOrgMember, getUsers,
} from '../api/admin';
import { useLabels } from '../hooks/useLabels';

const ROLE_COLOR: Record<string, string> = {
  patient: 'bg-blue-100 text-blue-700',
  doctor:  'bg-purple-100 text-purple-700',
  nurse:   'bg-pink-100 text-pink-700',
  admin:   'bg-gray-100 text-gray-700',
};

export default function OrgMembersPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const labels = useLabels();

  const [org, setOrg]               = useState<any>(null);
  const [members, setMembers]       = useState<any[]>([]);
  const [isLoading, setIsLoading]   = useState(true);

  // 削除確認モーダル
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [isDeleting, setIsDeleting]     = useState(false);

  // メンバー追加モーダル
  const [showAdd, setShowAdd]         = useState(false);
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

  const fetchMembers = () => {
    if (!id) return;
    setIsLoading(true);
    Promise.all([getOrganization(id), getOrgMembers(id)])
      .then(([o, m]) => { setOrg(o); setMembers(m); })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { fetchMembers(); }, [id]);

  const handleDelete = async () => {
    if (!deleteTarget || !id) return;
    setIsDeleting(true);
    try {
      await removeOrgMember(id, deleteTarget.id);
      setDeleteTarget(null);
      fetchMembers();
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
      // 既存メンバーを除外
      const memberIds = new Set(members.map((m) => m.id));
      setUserResults(results.filter((u: any) => !memberIds.has(u.id)));
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAdd = async (userId: string) => {
    if (!id) return;
    setIsAdding(true);
    try {
      await addOrgMember(id, userId);
      setShowAdd(false);
      setUserSearch('');
      setUserResults([]);
      fetchMembers();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? '追加に失敗しました');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/admin/organizations')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-text-main">
              {org?.name ?? '...'} — メンバー管理
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">組織への所属設定がアクセス制御の実体です</p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="ml-auto px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            ＋ メンバー追加
          </button>
        </div>

        {/* メンバーテーブル */}
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
                  {['ユーザー名/氏名', 'ロール', '所属日', '操作'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map((m, i) => (
                  <tr key={m.id} className={`${i !== members.length - 1 ? 'border-b border-gray-50' : ''}`}>
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-text-main">{m.username}</p>
                      {m.name && <p className="text-xs text-gray-400">{m.name}</p>}
                    </td>
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
            <p className="text-sm text-gray-600 mb-5">
              <span className="font-medium">{deleteTarget.name ?? deleteTarget.username}</span> をこの組織から削除します。
              この操作により、該当ユーザーへのアクセス権限が変更されます。
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
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2"
              >
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
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="ユーザー名・氏名で検索"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={handleSearch}
                disabled={isSearching}
                className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark disabled:opacity-60"
              >
                検索
              </button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
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
                    <button
                      onClick={() => handleAdd(u.id)}
                      disabled={isAdding}
                      className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary-dark disabled:opacity-60"
                    >
                      追加
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => { setShowAdd(false); setUserSearch(''); setUserResults([]); }}
              className="mt-4 w-full py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
