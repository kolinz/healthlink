import { useEffect, useState } from 'react';
import { getUsers, createUser, updateUser, resetPassword } from '../api/admin';
import { useLabels } from '../hooks/useLabels';

type Role = 'patient' | 'doctor' | 'nurse' | 'admin';

const ROLE_COLOR: Record<string, string> = {
  patient: 'bg-blue-100 text-blue-700',
  doctor:  'bg-purple-100 text-purple-700',
  nurse:   'bg-pink-100 text-pink-700',
  admin:   'bg-gray-100 text-gray-700',
};

export default function UserManagementPage() {
  const labels = useLabels();

  const [users, setUsers]           = useState<any[]>([]);
  const [search, setSearch]         = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [isLoading, setIsLoading]   = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser]     = useState<any | null>(null);
  const [newPw, setNewPw]           = useState('');
  const [pwMsg, setPwMsg]           = useState('');

  const [form, setForm]         = useState({ username: '', password: '', role: 'patient' as Role, name: '', email: '', position: '' });
  const [editForm, setEditForm] = useState({ role: '', is_active: 1, position: '' });

  const fetchUsers = () => {
    setIsLoading(true);
    getUsers({ search: search || undefined, role: roleFilter || undefined })
      .then(setUsers).catch(console.error).finally(() => setIsLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const roleLabel = (role: string) => {
    if (role === 'patient') return labels.patient;
    if (role === 'doctor')  return labels.doctor;
    if (role === 'nurse')   return labels.nurse;
    return labels.admin;
  };

  const handleCreate = async () => {
    try {
      await createUser(form);
      setShowCreate(false);
      setForm({ username: '', password: '', role: 'patient', name: '', email: '', position: '' });
      fetchUsers();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? '作成に失敗しました');
    }
  };

  const handleUpdate = async () => {
    if (!editUser) return;
    try {
      await updateUser(editUser.id, editForm);
      setEditUser(null);
      fetchUsers();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? '更新に失敗しました');
    }
  };

  const handleResetPw = async () => {
    if (!editUser || !newPw) return;
    try {
      await resetPassword(editUser.id, newPw);
      setPwMsg('パスワードを再設定しました');
      setNewPw('');
    } catch {
      setPwMsg('再設定に失敗しました');
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-text-main">ユーザー管理</h1>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            ＋ ユーザー作成
          </button>
        </div>

        {/* 検索・フィルタ */}
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
            placeholder="ユーザー名・氏名で検索"
            className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">全ロール</option>
            <option value="patient">{labels.patient}</option>
            <option value="doctor">{labels.doctor}</option>
            <option value="nurse">{labels.nurse}</option>
            <option value="admin">{labels.admin}</option>
          </select>
          <button onClick={fetchUsers} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark">
            検索
          </button>
        </div>

        {/* テーブル */}
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
                  {['ユーザー名/氏名', '役職・学年', 'ロール', 'ステータス', '操作'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.id} className={`${i !== users.length - 1 ? 'border-b border-gray-50' : ''}`}>
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-text-main">{u.username}</p>
                      {u.name && <p className="text-xs text-gray-400">{u.name}</p>}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">{u.position ?? '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ROLE_COLOR[u.role]}`}>
                        {roleLabel(u.role)}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {u.is_active ? '有効' : '無効'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => { setEditUser(u); setEditForm({ role: u.role, is_active: u.is_active, position: u.position ?? '' }); setPwMsg(''); }}
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
            <h3 className="text-base font-semibold text-text-main mb-4">ユーザー作成</h3>
            <div className="space-y-3">
              <input type="text" placeholder="ユーザー名 *" value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              <input type="password" placeholder="パスワード *" value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="patient">{labels.patient}</option>
                <option value="doctor">{labels.doctor}</option>
                <option value="nurse">{labels.nurse}</option>
                <option value="admin">{labels.admin}</option>
              </select>
              <input type="text" placeholder="氏名" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              <input type="email" placeholder="メール" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              <input type="text" placeholder="役職・学年（例: 3年生、主任）" value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              {form.role === 'patient' && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
                  初回ログイン時に同意画面へ案内されます
                </div>
              )}
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
      {editUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-base font-semibold text-text-main mb-1">ユーザー編集</h3>
            <p className="text-sm text-gray-400 mb-4">{editUser.username}</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">ロール</label>
                <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="patient">{labels.patient}</option>
                  <option value="doctor">{labels.doctor}</option>
                  <option value="nurse">{labels.nurse}</option>
                  <option value="admin">{labels.admin}</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">ステータス</label>
                <select value={editForm.is_active} onChange={(e) => setEditForm({ ...editForm, is_active: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value={1}>有効</option>
                  <option value={0}>無効</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">役職・学年</label>
                <input type="text" placeholder="例: 3年生、主任" value={editForm.position}
                  onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="pt-2 border-t border-gray-100">
                <label className="text-xs font-medium text-gray-500 mb-1 block">パスワード再設定</label>
                <div className="flex gap-2">
                  <input type="password" placeholder="新しいパスワード" value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                  <button onClick={handleResetPw} disabled={!newPw}
                    className="px-4 py-2 bg-background border border-gray-200 rounded-xl text-xs font-medium hover:border-primary hover:text-primary transition-colors disabled:opacity-50">
                    再設定
                  </button>
                </div>
                {pwMsg && <p className="text-xs text-green-600 mt-1">{pwMsg}</p>}
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setEditUser(null)}
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
