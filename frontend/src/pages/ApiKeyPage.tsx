import { useEffect, useState } from 'react';
import { getApiKeys, createApiKey, updateApiKey, deleteApiKey } from '../api/admin';
import { formatDateTimeFull } from '../utils/date';

export default function ApiKeyPage() {
  const [keys, setKeys]           = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyExpires, setNewKeyExpires] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [editKey, setEditKey]     = useState<any | null>(null);
  const [editName, setEditName]   = useState('');
  const [editExpires, setEditExpires] = useState('');
  const [isSaving, setIsSaving]   = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copied, setCopied]       = useState(false);

  const fetchKeys = () => {
    setIsLoading(true);
    getApiKeys().then(setKeys).catch(console.error).finally(() => setIsLoading(false));
  };

  useEffect(() => { fetchKeys(); }, []);

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    setIsCreating(true);
    try {
      const result = await createApiKey({ name: newKeyName, expires_at: newKeyExpires || undefined });
      setCreatedKey(result.rawKey);
      fetchKeys();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? '作成に失敗しました');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdate = async () => {
    if (!editKey) return;
    setIsSaving(true);
    try {
      await updateApiKey(editKey.id, { name: editName, expires_at: editExpires || undefined });
      setEditKey(null);
      fetchKeys();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? '更新に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteApiKey(deleteTarget.id);
      setDeleteTarget(null);
      fetchKeys();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? '失効に失敗しました');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text-main">APIキー管理</h1>
            <p className="text-sm text-gray-500 mt-0.5">外部連携用のAPIキーを管理します</p>
          </div>
          <button
            onClick={() => { setShowCreate(true); setNewKeyName(''); setNewKeyExpires(''); setCreatedKey(null); }}
            className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            ＋ 新規発行
          </button>
        </div>

        {/* 注意バナー */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-5 flex gap-3">
          <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm text-yellow-700">
            APIキーは発行時に1回だけ表示されます。安全な場所に保管してください。紛失した場合は再発行が必要です。
          </p>
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
          ) : keys.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">APIキーがありません</div>
          ) : (
            <table className="w-full">
              <thead className="bg-background border-b border-gray-100">
                <tr>
                  {['名称', 'ステータス', '作成日時', '最終使用', '有効期限', '操作'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {keys.map((k, i) => (
                  <tr key={k.id} className={`${i !== keys.length - 1 ? 'border-b border-gray-50' : ''}`}>
                    <td className="px-5 py-3 text-sm font-medium text-text-main">{k.name}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${k.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {k.is_active ? '有効' : '失効'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">{formatDateTimeFull(k.created_at)}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">
                      {k.last_used_at ? formatDateTimeFull(k.last_used_at) : <span className="text-gray-300">未使用</span>}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">
                      {k.expires_at ? formatDateTimeFull(k.expires_at) : <span className="text-gray-300">無期限</span>}
                    </td>
                    <td className="px-5 py-3 flex gap-3">
                      <button
                        onClick={() => { setEditKey(k); setEditName(k.name); setEditExpires(k.expires_at ?? ''); }}
                        className="text-xs text-primary hover:underline"
                      >
                        編集
                      </button>
                      {k.is_active && (
                        <button
                          onClick={() => setDeleteTarget(k)}
                          className="text-xs text-red-500 hover:underline"
                        >
                          失効
                        </button>
                      )}
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
            {createdKey ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-base font-semibold text-text-main">APIキーを発行しました</h3>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  以下のキーをコピーして安全な場所に保管してください。<span className="font-semibold text-red-600">このダイアログを閉じると再表示できません。</span>
                </p>
                <div className="flex gap-2 mb-5">
                  <code className="flex-1 bg-background border border-gray-200 rounded-xl px-3 py-2 text-xs text-text-main break-all font-mono">
                    {createdKey}
                  </code>
                  <button
                    onClick={() => handleCopy(createdKey)}
                    className="px-3 py-2 bg-primary text-white rounded-xl text-xs font-medium hover:bg-primary-dark transition-colors flex-shrink-0"
                  >
                    {copied ? '✓' : 'コピー'}
                  </button>
                </div>
                <button
                  onClick={() => { setShowCreate(false); setCreatedKey(null); }}
                  className="w-full py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark"
                >
                  閉じる
                </button>
              </>
            ) : (
              <>
                <h3 className="text-base font-semibold text-text-main mb-4">APIキー発行</h3>
                <div className="space-y-3 mb-5">
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">名称 *</label>
                    <input type="text" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="例: 外部システム連携用"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">有効期限（任意）</label>
                    <input type="date" value={newKeyExpires} onChange={(e) => setNewKeyExpires(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowCreate(false)}
                    className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50">
                    キャンセル
                  </button>
                  <button onClick={handleCreate} disabled={isCreating || !newKeyName.trim()}
                    className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark disabled:opacity-60">
                    {isCreating ? '発行中...' : '発行する'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 編集モーダル */}
      {editKey && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-base font-semibold text-text-main mb-4">APIキー編集</h3>
            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">名称</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">有効期限</label>
                <input type="date" value={editExpires} onChange={(e) => setEditExpires(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditKey(null)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50">
                キャンセル
              </button>
              <button onClick={handleUpdate} disabled={isSaving}
                className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark disabled:opacity-60">
                {isSaving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 失効確認モーダル */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-base font-semibold text-text-main mb-2">APIキーを失効しますか？</h3>
            <p className="text-sm text-gray-600 mb-5">
              「{deleteTarget.name}」を失効します。このキーを使用している外部システムからのアクセスが停止されます。
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)} disabled={isDeleting}
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 disabled:opacity-60">
                キャンセル
              </button>
              <button onClick={handleDelete} disabled={isDeleting}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium disabled:opacity-60">
                {isDeleting ? '処理中...' : '失効する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
