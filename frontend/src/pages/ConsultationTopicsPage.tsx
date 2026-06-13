import { useEffect, useState } from 'react';
import {
  getTopicsAdmin, createTopic, updateTopic, deleteTopic,
} from '../api/admin';

interface Topic {
  id: string;
  label: string;
  icon: string;
  sort_order: number;
  is_active: number;
  created_at: string;
}

const EMPTY_FORM = { label: '', icon: '', is_active: 1 };

export default function ConsultationTopicsPage() {
  const [topics, setTopics]         = useState<Topic[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editTopic, setEditTopic]   = useState<Topic | null>(null);
  const [form, setForm]             = useState(EMPTY_FORM);

  // ドラッグ状態
  const [dragIndex, setDragIndex]   = useState<number | null>(null);
  const [dragOver, setDragOver]     = useState<number | null>(null);

  const fetchTopics = () => {
    setIsLoading(true);
    getTopicsAdmin()
      .then((data) => setTopics(data.sort((a: Topic, b: Topic) => a.sort_order - b.sort_order)))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { fetchTopics(); }, []);

  const handleCreate = async () => {
    try {
      await createTopic({ ...form, sort_order: topics.length + 1 });
      setShowCreate(false);
      setForm(EMPTY_FORM);
      fetchTopics();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? '作成に失敗しました');
    }
  };

  const handleUpdate = async () => {
    if (!editTopic) return;
    try {
      await updateTopic(editTopic.id, form);
      setEditTopic(null);
      fetchTopics();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? '更新に失敗しました');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('このトピックを削除しますか？')) return;
    try {
      await deleteTopic(id);
      fetchTopics();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? '削除に失敗しました');
    }
  };

  // ドラッグ＆ドロップで並び替え
  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver  = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOver(index);
  };

  const handleDrop = async (dropIndex: number) => {
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      setDragOver(null);
      return;
    }

    // 順序を入れ替え
    const reordered = [...topics];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, moved);

    // sort_order を再計算
    const updated = reordered.map((t, i) => ({ ...t, sort_order: i + 1 }));
    setTopics(updated);
    setDragIndex(null);
    setDragOver(null);

    // 変更があったものだけ API 更新
    try {
      await Promise.all(
        updated
          .filter((t, i) => t.sort_order !== topics[i]?.sort_order)
          .map((t) => updateTopic(t.id, { sort_order: t.sort_order }))
      );
    } catch (e) { console.error(e); }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text-main">相談トピック管理</h1>
            <p className="text-sm text-gray-500 mt-0.5">ドラッグで並び替えができます</p>
          </div>
          <button
            onClick={() => { setShowCreate(true); setForm(EMPTY_FORM); }}
            className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            ＋ トピック追加
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
          ) : topics.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">トピックがありません</div>
          ) : (
            <div>
              {topics.map((topic, i) => (
                <div
                  key={topic.id}
                  draggable
                  onDragStart={() => handleDragStart(i)}
                  onDragOver={(e) => handleDragOver(e, i)}
                  onDrop={() => handleDrop(i)}
                  onDragEnd={() => { setDragIndex(null); setDragOver(null); }}
                  className={`flex items-center gap-3 px-5 py-3 transition-colors
                    ${i !== topics.length - 1 ? 'border-b border-gray-50' : ''}
                    ${dragOver === i ? 'bg-primary-light' : 'hover:bg-background'}
                    ${dragIndex === i ? 'opacity-40' : ''}
                    cursor-grab active:cursor-grabbing`}
                >
                  {/* ドラッグハンドル */}
                  <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
                  </svg>

                  {/* アイコン */}
                  <span className="text-xl w-8 text-center flex-shrink-0">
                    {iconEmoji(topic.icon)}
                  </span>

                  {/* ラベル */}
                  <span className="flex-1 text-sm font-medium text-text-main">{topic.label}</span>

                  {/* ステータスバッジ */}
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0
                    ${topic.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {topic.is_active ? '有効' : '無効'}
                  </span>

                  {/* 操作 */}
                  <div className="flex gap-3 flex-shrink-0">
                    <button
                      onClick={() => { setEditTopic(topic); setForm({ label: topic.label, icon: topic.icon, is_active: topic.is_active }); }}
                      className="text-xs text-primary hover:underline"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDelete(topic.id)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 作成・編集モーダル（共通） */}
      {(showCreate || editTopic) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-base font-semibold text-text-main mb-4">
              {showCreate ? 'トピック作成' : 'トピック編集'}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">ラベル *</label>
                <input
                  type="text"
                  placeholder="例: 体調・症状"
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">アイコン名</label>
                <input
                  type="text"
                  placeholder="例: ti-thermometer"
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {form.icon && (
                  <p className="text-xs text-gray-400 mt-1">プレビュー: {iconEmoji(form.icon)}</p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">ステータス</label>
                <select
                  value={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value={1}>有効</option>
                  <option value={0}>無効</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => { setShowCreate(false); setEditTopic(null); }}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={showCreate ? handleCreate : handleUpdate}
                className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark"
              >
                {showCreate ? '作成' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function iconEmoji(icon: string): string {
  const map: Record<string, string> = {
    'ti-thermometer': '🌡️',
    'ti-pill':        '💊',
    'ti-salad':       '🥗',
    'ti-dots':        '💬',
  };
  return map[icon] ?? '💬';
}
