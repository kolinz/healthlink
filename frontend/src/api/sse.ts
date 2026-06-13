// SSEクライアント
// POST リクエストのため EventSource は使用しない。
// fetch() + ReadableStream で実装する。

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

export interface SseCallbacks {
  onDelta: (delta: string) => void;
  onDone: () => void;
  onError: (error: Error) => void;
}

/**
 * SSE ストリーミングリクエストを送信する
 *
 * @param path    APIパス（例: /ai/consultations/:id/messages）
 * @param body    リクエストボディ
 * @param callbacks onDelta / onDone / onError コールバック
 */
export async function sendSseRequest(
  path: string,
  body: Record<string, unknown>,
  callbacks: SseCallbacks,
): Promise<void> {
  const { onDelta, onDone, onError } = callbacks;

  const token = localStorage.getItem('accessToken');

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    onError(err instanceof Error ? err : new Error('ネットワークエラーが発生しました'));
    return;
  }

  if (!response.ok) {
    onError(new Error(`HTTPエラー: ${response.status}`));
    return;
  }

  if (!response.body) {
    onError(new Error('レスポンスボディが空です'));
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const lines = decoder.decode(value, { stream: true }).split('\n');
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;

        const data = line.slice(6).trim();
        if (!data) continue;

        // ストリーム終了シグナル
        if (data === '[DONE]') {
          onDone();
          return;
        }

        // delta チャンクをパースして onDelta に渡す
        try {
          const parsed = JSON.parse(data) as { delta?: string; error?: string };
          if (parsed.error) {
            onError(new Error(parsed.error));
            return;
          }
          if (parsed.delta !== undefined) {
            onDelta(parsed.delta);
          }
        } catch {
          // JSON パースエラーは無視して継続
        }
      }
    }
  } catch (err) {
    onError(err instanceof Error ? err : new Error('ストリーム読み取りエラー'));
  } finally {
    reader.releaseLock();
  }
}
