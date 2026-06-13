import db from '../db/client';

// ============================================================
// AIプロバイダ抽象化インターフェース
// ============================================================

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIProviderInterface {
  chat(messages: ChatMessage[], systemPrompt?: string): Promise<string>;
  stream(messages: ChatMessage[], systemPrompt?: string): AsyncIterable<string>;
}

// ============================================================
// OllamaProvider
// ============================================================
export class OllamaProvider implements AIProviderInterface {
  constructor(private endpoint: string, private model: string) {}

  async chat(messages: ChatMessage[], systemPrompt?: string): Promise<string> {
    const body: any = {
      model: this.model,
      messages: systemPrompt
        ? [{ role: 'system', content: systemPrompt }, ...messages]
        : messages,
      stream: false,
    };

    const res = await fetch(`${this.endpoint}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json() as any;
    return data.message?.content ?? '';
  }

  async *stream(messages: ChatMessage[], systemPrompt?: string): AsyncIterable<string> {
    const body: any = {
      model: this.model,
      messages: systemPrompt
        ? [{ role: 'system', content: systemPrompt }, ...messages]
        : messages,
      stream: true,
    };

    const res = await fetch(`${this.endpoint}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value).split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const json = JSON.parse(line) as any;
          if (json.message?.content) {
            yield json.message.content;
          }
        } catch {
          // パースエラーは無視
        }
      }
    }
  }
}

// ============================================================
// OpenAIProvider
// ============================================================
export class OpenAIProvider implements AIProviderInterface {
  private model: string;

  constructor(
    private endpoint: string,
    private apiKey: string,
    model?: string | null,
  ) {
    // model が空・null・undefined の場合は gpt-5-nano をデフォルト使用
    this.model = model?.trim() || 'gpt-5-nano';
  }

  async chat(messages: ChatMessage[], systemPrompt?: string): Promise<string> {
    const body = {
      model: this.model,
      messages: systemPrompt
        ? [{ role: 'system', content: systemPrompt }, ...messages]
        : messages,
    };

    const res = await fetch(`${this.endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json() as any;
    return data.choices?.[0]?.message?.content ?? '';
  }

  async *stream(messages: ChatMessage[], systemPrompt?: string): AsyncIterable<string> {
    const body = {
      model: this.model,
      messages: systemPrompt
        ? [{ role: 'system', content: systemPrompt }, ...messages]
        : messages,
      stream: true,
    };

    const res = await fetch(`${this.endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value).split('\n');
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') return;
        try {
          const json = JSON.parse(data) as any;
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) yield delta;
        } catch {
          // パースエラーは無視
        }
      }
    }
  }
}

// ============================================================
// DifyProvider
// ============================================================
export class DifyProvider implements AIProviderInterface {
  constructor(
    private endpoint: string,
    private apiKey: string,
  ) {}

  async chat(messages: ChatMessage[], systemPrompt?: string): Promise<string> {
    // Dify は最新の1メッセージを query として送信
    const lastMessage = messages[messages.length - 1];
    const body: any = {
      inputs: {},
      query: lastMessage?.content ?? '',
      response_mode: 'blocking',
      user: 'healthlink-user',
    };

    const res = await fetch(`${this.endpoint}/v1/chat-messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json() as any;
    return data.answer ?? '';
  }

  async *stream(
    messages: ChatMessage[],
    systemPrompt?: string,
    conversationId?: string,
    onConversationId?: (id: string) => void,
  ): AsyncIterable<string> {
    // Dify へ渡すのは最新の1メッセージのみ（query フィールド）
    const lastMessage = messages[messages.length - 1];
    const body: any = {
      inputs: {},
      query: lastMessage?.content ?? '',
      response_mode: 'streaming',
      user: 'healthlink-user',
    };

    // 2回目以降: 保存済みの conversation_id を渡して会話を継続
    if (conversationId) {
      body.conversation_id = conversationId;
    }

    const res = await fetch(`${this.endpoint}/v1/chat-messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value).split('\n');
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        try {
          const json = JSON.parse(data) as any;
          // 初回レスポンスで conversation_id を取得・保存
          if (json.conversation_id && onConversationId) {
            onConversationId(json.conversation_id);
          }
          if (json.event === 'message' && json.answer) {
            yield json.answer;
          }
        } catch {
          // パースエラーは無視
        }
      }
    }
  }
}

// ============================================================
// アクティブなプロバイダを取得するファクトリ関数
// ============================================================
export function getActiveProvider(): { provider: AIProviderInterface; record: any } {
  const record = db.prepare(`
    SELECT * FROM ai_providers WHERE active = 1 LIMIT 1
  `).get() as any;

  if (!record) {
    throw new Error('AI_PROVIDER_UNAVAILABLE');
  }

  let provider: AIProviderInterface;

  switch (record.provider_type) {
    case 'ollama':
      provider = new OllamaProvider(record.endpoint, record.model ?? 'llama3');
      break;
    case 'openai':
      provider = new OpenAIProvider(record.endpoint, record.api_key ?? '', record.model);
      break;
    case 'dify':
      provider = new DifyProvider(record.endpoint, record.api_key ?? '');
      break;
    default:
      throw new Error('AI_PROVIDER_UNAVAILABLE');
  }

  return { provider, record };
}
