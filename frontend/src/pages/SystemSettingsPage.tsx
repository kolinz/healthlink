import { useEffect, useState } from 'react';
import apiClient from '../api/client';

const DEFAULT_PROMPT = 'あなたは相談者の健康状態をサポートするAIアシスタントです。\n医師の診断や処方の代替は禁止です。症状が重い場合は必ず医師への相談を促してください。';

export default function SystemSettingsPage() {
  const [prompt, setPrompt]       = useState('');
  const [original, setOriginal]   = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving]   = useState(false);
  const [message, setMessage]     = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    apiClient.get('/system-settings')
      .then((res) => {
        const row = (res.data as any[]).find((s) => s.key === 'system_prompt');
        const value = row?.value ?? DEFAULT_PROMPT;
        setPrompt(value);
        setOriginal(value);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const isDirty = prompt !== original;

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      await apiClient.put('/system-settings/system_prompt', { value: prompt });
      setOriginal(prompt);
      setMessage({ type: 'success', text: 'システムプロンプトを保存しました' });
    } catch {
      setMessage({ type: 'error', text: '保存に失敗しました。もう一度お試しください。' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setPrompt(DEFAULT_PROMPT);
    setMessage(null);
  };

  return (
    <div className="p-8">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-text-main mb-2">システムプロンプト設定</h1>
        <p className="text-sm text-gray-500 mb-6">AI相談時に使用するシステムプロンプトを管理します</p>

        {/* システムプロンプト設定カード */}
        <div className="bg-card rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-text-main mb-1">
              AIシステムプロンプト
            </label>
            <p className="text-xs text-gray-400 mb-3">
              患者がAI相談を行う際に、AIへ与える指示文です。薬機法・医療法への配慮を踏まえて設定してください。
            </p>

            {/* 薬機法注意バナー */}
            <div className="flex gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-xl mb-3">
              <svg className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-xs text-yellow-700">
                AIが医療診断・処方・治療の代替となる回答をしないよう、プロンプトで明示的に禁止してください。薬機法・医師法への抵触を避けるため、「医師への相談を促す」旨を必ず含めることを推奨します。
              </p>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <svg className="animate-spin h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
              </div>
            ) : (
              <textarea
                value={prompt}
                onChange={(e) => { setPrompt(e.target.value); setMessage(null); }}
                rows={8}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                placeholder="システムプロンプトを入力..."
              />
            )}
          </div>

          {/* メッセージ表示 */}
          {message && (
            <div className={`flex items-center gap-2 p-3 rounded-xl text-sm
              ${message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
              }`}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {message.type === 'success' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                )}
              </svg>
              {message.text}
            </div>
          )}

          {/* ボタン */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handleReset}
              className="text-sm text-gray-400 hover:text-gray-600 hover:underline transition-colors"
            >
              デフォルトに戻す
            </button>
            <div className="flex gap-2">
              {isDirty && (
                <button
                  onClick={() => { setPrompt(original); setMessage(null); }}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-colors"
                >
                  キャンセル
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={isSaving || !isDirty}
                className="px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    保存中...
                  </>
                ) : '保存する'}
              </button>
            </div>
          </div>
        </div>

        {/* 現在の設定プレビュー */}
        <div className="mt-6 bg-background rounded-2xl border border-gray-100 p-5">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">現在のプロンプトプレビュー</h2>
          <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono leading-relaxed">
            {prompt || '（未設定）'}
          </pre>
        </div>
      </div>
    </div>
  );
}
