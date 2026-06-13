import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getConsultation } from '../api/consultations';
import { sendSseRequest } from '../api/sse';

const RISK_BANNER: Record<string, { label: string; color: string }> = {
  low:    { label: '低リスク — 経過観察',         color: 'bg-green-100 text-green-700 border-green-200' },
  medium: { label: '中リスク — 担当者に確認推奨', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  high:   { label: '高リスク — 早めに医療機関へ', color: 'bg-red-100 text-red-700 border-red-200' },
};

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

export default function ConsultationChatPage() {
  const { id } = useParams<{ id: string }>();

  const [consultation, setConsultation] = useState<any>(null);
  const [messages, setMessages]         = useState<Message[]>([]);
  const [input, setInput]               = useState('');
  const [isStreaming, setIsStreaming]   = useState(false);
  const [isLoading, setIsLoading]       = useState(true);

  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!id) return;
    getConsultation(id)
      .then((data) => {
        setConsultation(data);
        setMessages(
          (data.messages ?? []).map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
          }))
        );
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || isStreaming || !id) return;

    setInput('');

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content };
    setMessages((prev) => [...prev, userMsg]);

    const assistantId = `a-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', content: '', isStreaming: true },
    ]);
    setIsStreaming(true);

    await sendSseRequest(
      `/ai/consultations/${id}/messages`,
      { content },
      {
        onDelta: (delta) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: m.content + delta }
                : m
            )
          );
        },
        onDone: () => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, isStreaming: false } : m
            )
          );
          setIsStreaming(false);
        },
        onError: (err) => {
          console.error(err);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: 'エラーが発生しました。もう一度お試しください。', isStreaming: false }
                : m
            )
          );
          setIsStreaming(false);
        },
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center flex-1 bg-background">
        <svg className="animate-spin h-6 w-6 text-primary" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* トピック表示 */}
      {consultation?.topic_label && (
        <div className="px-4 py-2 bg-accent-light border-b border-accent">
          <p className="text-xs text-accent font-medium">#{consultation.topic_label}</p>
        </div>
      )}

      {/* 危険度バナー */}
      {consultation?.risk_level && RISK_BANNER[consultation.risk_level] && (
        <div className={`px-4 py-2.5 border-b flex items-center gap-2 text-sm font-medium ${RISK_BANNER[consultation.risk_level].color}`}>
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {RISK_BANNER[consultation.risk_level].label}
        </div>
      )}

      {/* メッセージ一覧 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-24">
        {messages.length === 0 && !isStreaming && (
          <div className="text-center py-10">
            <div className="w-14 h-14 bg-accent-light rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <p className="text-sm text-gray-400">気になることを入力してください</p>
            <p className="text-xs text-gray-300 mt-1">症状が重い場合は医療機関を受診してください</p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-end gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mb-1">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            )}
            <div
              className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed
                ${msg.role === 'user'
                  ? 'bg-primary text-white rounded-br-sm'
                  : 'bg-white text-text-main border border-gray-100 rounded-bl-sm shadow-sm'
                }`}
            >
              {msg.isStreaming && msg.content === '' ? (
                <span className="flex gap-1 items-center h-5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </span>
              ) : (
                <span className="whitespace-pre-wrap">{msg.content}</span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* 入力エリア */}
      <div className="bg-white border-t border-gray-100 px-4 py-3 flex-shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="メッセージを入力..."
            disabled={isStreaming}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-2xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-50 disabled:text-gray-400 max-h-32 overflow-y-auto"
            style={{ minHeight: '44px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="w-11 h-11 bg-primary hover:bg-primary-dark text-white rounded-full flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-gray-300 mt-1.5 text-center">
          AIの回答は医療診断ではありません。症状が重い場合は医療機関へ。
        </p>
      </div>
    </div>
  );
}
