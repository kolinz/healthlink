import { useEffect, useState } from 'react';
import {
  getAiProviders, createAiProvider, updateAiProvider,
  deleteAiProvider, activateAiProvider,
} from '../api/admin';

type ProviderType = 'ollama' | 'openai' | 'dify';

const OPENAI_MODEL_PRESETS = [
  { value: 'gpt-5-nano',  label: 'gpt-5-nano（デフォルト）' },
  { value: 'gpt-4o',      label: 'gpt-4o' },
  { value: 'gpt-4o-mini', label: 'gpt-4o-mini' },
  { value: '__custom__',  label: 'その他（直接入力）' },
];

const EMPTY_FORM = {
  name: '', provider_type: 'ollama' as ProviderType,
  endpoint: '', api_key: '', model: '', modelPreset: 'gpt-5-nano',
};

export default function AIProviderPage() {
  const [providers, setProviders]   = useState<any[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editProvider, setEditProvider] = useState<any | null>(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchProviders = () => {
    setIsLoading(true);
    getAiProviders().then(setProviders).catch(console.error).finally(() => setIsLoading(false));
  };

  useEffect(() => { fetchProviders(); }, []);

  // フォームからモデル値を解決
  const resolveModel = () => {
    if (form.provider_type === 'openai') {
      return form.modelPreset === '__custom__' ? form.model : form.modelPreset;
    }
    if (form.provider_type === 'ollama') return form.model;
    return undefined; // dify はモデル不要
  };

  const handleCreate = async () => {
    try {
      await createAiProvider({
        name: form.name,
        provider_type: form.provider_type,
        endpoint: form.endpoint,
        api_key: form.api_key || undefined,
        model: resolveModel(),
      });
      setShowCreate(false);
      setForm(EMPTY_FORM);
      fetchProviders();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? '作成に失敗しました');
    }
  };

  const handleUpdate = async () => {
    if (!editProvider) return;
    try {
      await updateAiProvider(editProvider.id, {
        name: form.name,
        provider_type: form.provider_type,
        endpoint: form.endpoint,
        api_key: form.api_key || undefined,
        model: resolveModel(),
      });
      setEditProvider(null);
      fetchProviders();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? '更新に失敗しました');
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await activateAiProvider(id);
      fetchProviders();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? '切り替えに失敗しました');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteAiProvider(deleteTarget.id);
      setDeleteTarget(null);
      fetchProviders();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? '削除に失敗しました');
    } finally {
      setIsDeleting(false);
    }
  };

  const openEdit = (p: any) => {
    const isCustom = p.model && !OPENAI_MODEL_PRESETS.slice(0, 3).map((x) => x.value).includes(p.model);
    setEditProvider(p);
    setForm({
      name: p.name,
      provider_type: p.provider_type,
      endpoint: p.endpoint,
      api_key: '',
      model: isCustom ? p.model : '',
      modelPreset: isCustom ? '__custom__' : (p.model || 'gpt-5-nano'),
    });
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-text-main">AI接続設定</h1>
          <button
            onClick={() => { setShowCreate(true); setForm(EMPTY_FORM); }}
            className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            ＋ プロバイダ追加
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
          ) : providers.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">プロバイダがありません</div>
          ) : (
            <table className="w-full">
              <thead className="bg-background border-b border-gray-100">
                <tr>
                  {['名称', 'タイプ', 'エンドポイント', 'モデル', 'ステータス', '操作'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {providers.map((p, i) => (
                  <tr key={p.id} className={`${i !== providers.length - 1 ? 'border-b border-gray-50' : ''}`}>
                    <td className="px-5 py-3 text-sm font-medium text-text-main">{p.name}</td>
                    <td className="px-5 py-3">
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                        {p.provider_type}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500 max-w-[180px] truncate">{p.endpoint}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">{p.model ?? '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${p.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {p.active ? '● アクティブ' : '非アクティブ'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-3">
                        {!p.active && (
                          <button
                            onClick={() => handleActivate(p.id)}
                            className="text-xs text-green-600 hover:underline"
                          >
                            アクティブにする
                          </button>
                        )}
                        <button onClick={() => openEdit(p)} className="text-xs text-primary hover:underline">編集</button>
                        <button onClick={() => setDeleteTarget(p)} className="text-xs text-red-500 hover:underline">削除</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 作成・編集モーダル */}
      {(showCreate || editProvider) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-semibold text-text-main mb-4">
              {showCreate ? 'プロバイダ追加' : 'プロバイダ編集'}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">名称 *</label>
                <input type="text" placeholder="例: OpenAI本番" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">プロバイダタイプ *</label>
                <select value={form.provider_type}
                  onChange={(e) => setForm({ ...form, provider_type: e.target.value as ProviderType, model: '', modelPreset: 'gpt-5-nano' })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="ollama">Ollama</option>
                  <option value="openai">OpenAI</option>
                  <option value="dify">Dify</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">エンドポイント *</label>
                <input type="text"
                  placeholder={form.provider_type === 'ollama' ? 'http://localhost:11434' : form.provider_type === 'openai' ? 'https://api.openai.com/v1' : 'https://api.dify.ai'}
                  value={form.endpoint}
                  onChange={(e) => setForm({ ...form, endpoint: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">APIキー（任意）</label>
                <input type="password" placeholder="変更する場合のみ入力" value={form.api_key}
                  onChange={(e) => setForm({ ...form, api_key: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>

              {/* モデル指定 — provider_type に応じて切り替え */}
              {form.provider_type === 'openai' && (
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">モデル</label>
                  <select value={form.modelPreset}
                    onChange={(e) => setForm({ ...form, modelPreset: e.target.value, model: '' })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary mb-2">
                    {OPENAI_MODEL_PRESETS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {form.modelPreset === '__custom__' && (
                    <input type="text" placeholder="モデル名を直接入力（例: gpt-4-turbo）"
                      value={form.model}
                      onChange={(e) => setForm({ ...form, model: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                  )}
                </div>
              )}

              {form.provider_type === 'ollama' && (
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">モデル</label>
                  <input type="text" placeholder="例: llama3" value={form.model}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              )}

              {/* dify: モデルフィールド非表示 */}
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => { setShowCreate(false); setEditProvider(null); }}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={showCreate ? handleCreate : handleUpdate}
                className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark"
              >
                {showCreate ? '追加' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 削除確認モーダル */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-base font-semibold text-text-main mb-2">プロバイダを削除しますか？</h3>
            <p className="text-sm text-gray-600 mb-5">
              <span className="font-medium">{deleteTarget.name}</span> を削除します。この操作は取り消せません。
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)} disabled={isDeleting}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-60">
                キャンセル
              </button>
              <button onClick={handleDelete} disabled={isDeleting}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium disabled:opacity-60">
                {isDeleting ? '削除中...' : '削除する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
