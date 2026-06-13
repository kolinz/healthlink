# SDD仕様書 — 患者体調共有・AI相談ポータル（Phase 1）

**バージョン:** 1.15
**作成日:** 2025-03-31
**更新日:** 2026-06-13
**ステータス:** 確定

### 変更履歴

| バージョン | 更新日 | 主な変更内容 |
|-----------|--------|------------|
| 1.0 | 2025-03-31 | 初版 |
| 1.1 | 2025-03-31 | DB設計・同意管理・AI接続仕様を確定 |
| 1.3 | 2025-05-06 | 組織管理・相談トピック・AIストリーミング・アクセス制御・管理者画面を追加。Swagger UIをPhase 2へ移行。 |
| 1.4 | 2026-06-09 | DBをPostgreSQL 16からSQLiteに変更。単一施設・限定ユーザー運用向けに再設計。Docker ComposeからPostgresコンテナを削除。ENUM→CHECK+TEXT、UUID→アプリ側生成に変更。 |
| 1.5 | 2026-06-09 | Docker Compose完全廃止（npm直接起動に変更）。Swagger UIをPhase 1スコープに昇格。 |
| 1.6 | 2026-06-09 | 運用モデルを「1インスタンス=1施設」として明文化。organizationsテーブルを将来拡張用として位置づけ変更。外部連携API（`/external/*`）とAPIキー認証（`api_keys`テーブル）を追加。管理者画面にAPIキー管理画面を追加。 |
| 1.7 | 2026-06-10 | ロールラベルのカスタマイズ機能を追加。`LABEL_PATIENT` / `LABEL_DOCTOR` / `LABEL_NURSE`（backend）および `VITE_LABEL_PATIENT` / `VITE_LABEL_DOCTOR` / `VITE_LABEL_NURSE`（frontend）環境変数で表示名を変更可能に。フロントエンドに `useLabels()` フックを追加。 |
| 1.8 | 2026-06-10 | 体調入力項目を再設計。`pain_score`→`condition`（1-10必須）、`appetite`→`appetite_score`（1-10必須）、`sleep_hours`廃止・`sleep_quality`（1-10必須）新規追加、血圧（systolic/diastolic）廃止。 |
| 1.9 | 2026-06-10 | `attention_score`（INTEGER 1-10・必須）を `daily_logs` に追加。1=全く構ってほしくない、10=とても構ってほしい。 |
| 1.10 | 2026-06-10 | `condition` カラムはINTEGERのまま維持。入力UIをrange sliderから5択ボタン選択式に変更。値は1〜5のみ使用（わくわく=5/楽しい=4/ふつう=3/しんどい=2/つらい=1）。医療者画面での数値→ラベル変換を規定。 |
| 1.11 | 2026-06-10 | AIプロバイダの `gemini` を `openai` に差し替え。`ai_providers` テーブルの `provider_type` CHECK制約を更新。管理画面にモデル選択UI（セレクト＋テキスト入力）を追加。デフォルトモデル: `gpt-5-nano`。 |
| 1.12 | 2026-06-10 | `temperature`（REAL）を `fever_score`（INTEGER 1-10）に改名・変更。`steps_yesterday`（INTEGER）をTEXT選択式（5段階レンジ）に変更。 |
| 1.15 | 2026-06-13 | タイムゾーン対応。`TZ=Asia/Tokyo` を `.env` に追加。`frontend/src/utils/date.ts` を新規追加（SQLiteのUTC文字列をJSTに変換）。全フロントエンド画面でJST表示に統一。|
| 1.14 | 2026-06-13 | 環境変数をルート `.env` に統合（`VITE_` プレフィックスに統一）。`VITE_LABEL_RESEARCH` 追加。同意画面の文言を環境変数から動的生成。相談トピック初期値を「体調・症状/薬・服薬/食事・栄養/その他」から「体調/生活/学業/その他」に変更（薬機法配慮）。|
| 1.13 | 2026-06-13 | `profiles.age`（INTEGER）を `profiles.position`（TEXT）に変更。`system_settings` テーブル追加。システムプロンプト管理API・管理画面を追加。管理画面に「メンバー管理」画面追加（全組織メンバー一覧・組織列付き）。ダッシュボードに所属組織列追加。患者詳細画面の体調履歴に全項目表示。起動スクリプト（start/stop .ps1/.sh）追加。 |

---

## 1. システム概要

病院と患者が日々の体調変化を共有し、患者がAIに相談でき、その履歴を医療者がモニタリングできるWebアプリケーション。**1インスタンスが1施設に対応し**、インフラ管理を最小化した構成で提供する。倫理審査に対応した同意管理機能を持つ。

**施設間のデータ連携は、各施設のHealthLinkインスタンスが外部連携API（`/external/*`）を通じてAPIキー認証で行う。**

### 運用モデル

```
施設A                    施設B                    集計基盤など
┌──────────────┐        ┌──────────────┐        ┌──────────────┐
│ HealthLink   │        │ HealthLink   │        │ 外部システム  │
│ (インスタンスA)│◄──API─►│ (インスタンスB)│◄──API─►│              │
│ SQLite DB    │        │ SQLite DB    │        │              │
└──────────────┘        └──────────────┘        └──────────────┘
```

### 提供機能

- 患者体調入力・履歴閲覧
- AI相談（チャット形式・SSEストリーミング・履歴保存）
- AI相談トピック選択（患者が相談開始時に選択、adminが管理）
- 医療者モニタリング（体調・AI相談履歴・メモ・対応ステータス）
- ユーザー登録・インフォームドコンセント取得
- ユーザー管理・組織管理・メンバー管理・担当割当管理（admin）
- 相談トピック管理（admin）
- AI接続設定（admin）
- **システム設定（AIシステムプロンプト管理）（admin）** ★v1.13追加
- API仕様書（Swagger UI）
- 外部連携API（APIキー認証）
- APIキー管理（admin）

### 対象環境

- Webアプリケーション（スマートフォン・PC対応）
- **運用規模:** 1インスタンス = 1施設（SQLite運用を前提）
- **実行環境:** Node.js 24 LTS + npm（Docker不要）

---

## 2. 技術スタック

| レイヤー | 技術 |
|---------|------|
| バックエンド | Node.js 24 LTS / TypeScript / Express |
| データベース | SQLite（better-sqlite3 v12.8.0以上） |
| フロントエンド | React / TypeScript / Tailwind CSS / shadcn/ui / Vite |
| 状態管理 | Zustand |
| AI接続 | Ollama / OpenAI / Dify |
| AIレスポンス | SSE（Server-Sent Events）ストリーミング |
| API仕様 | OpenAPI 3.0 / swagger-jsdoc + swagger-ui-express |
| インフラ | なし（npm直接起動） |

---

## 3. ロール設計

| ロール | 説明 |
|-------|------|
| `patient` | 体調入力・AI相談・自身の履歴閲覧 |
| `doctor` | 同一組織の患者全員のモニタリング・メモ・対応ステータス変更 |
| `nurse` | 同一組織の患者全員のモニタリング・メモ・対応ステータス変更 |
| `admin` | システム全体の管理（ユーザー・組織・トピック・AI設定・システム設定・APIキー） |

### アクセス制御の原則

- doctor / nurse は `user_organizations` テーブルで同一組織に所属するpatientのデータにアクセスできる
- アクセス範囲はadminが組織メンバーシップを操作することで制御する（コードへの直接埋め込みなし）
- 患者が同意撤回（`consent_agreed=0`）した場合、医療者・外部APIからの当該患者データへのアクセスを即時停止する

---

## 4. 認証仕様

### 内部ユーザー認証（JWT）

- ユーザー名 + パスワード → アクセストークン（15分）+ リフレッシュトークン（7日）

### 外部連携認証（APIキー）

- `api_keys` テーブルで管理するAPIキーをリクエストヘッダーで渡す
- ヘッダー形式: `X-API-Key: {key}`
- APIキーは `crypto.randomBytes(32).toString('hex')` で生成し、SHA-256ハッシュをDBに保存する

---

## 5. データベース設計

> **SQLite固有の実装ルール**
> - ENUM型は存在しない → `TEXT` + `CHECK(col IN (...))` 制約で代替
> - BOOLEAN型は存在しない → `INTEGER`（0/1）で代替
> - UUIDはアプリ側（`uuid` パッケージ）で生成してTEXTとして保存
> - `TIMESTAMPTZ` → `TEXT`（ISO 8601形式: `DATETIME('now')`）
> - 外部キー制約はデフォルト無効 → 接続時に `PRAGMA foreign_keys = ON` を実行すること
> - DBファイルパス: `backend/data/healthlink.db`
> - better-sqlite3 は**同期API**。async/await と混在させないこと

### users

```sql
CREATE TABLE IF NOT EXISTS users (
  id                   TEXT PRIMARY KEY,
  username             TEXT UNIQUE NOT NULL,
  password_hash        TEXT NOT NULL,
  role                 TEXT NOT NULL CHECK(role IN ('patient','doctor','nurse','admin')),
  is_active            INTEGER NOT NULL DEFAULT 1,
  consent_agreed       INTEGER NOT NULL DEFAULT 0,
  consent_agreed_at    TEXT,
  consent_version      TEXT,
  consent_withdrawn_at TEXT,
  created_at           TEXT NOT NULL DEFAULT (DATETIME('now'))
);
```

### profiles ★v1.13変更: age → position

```sql
CREATE TABLE IF NOT EXISTS profiles (
  id                      TEXT PRIMARY KEY,
  user_id                 TEXT NOT NULL REFERENCES users(id),
  name                    TEXT,
  email                   TEXT,
  position                TEXT,  -- 役職・学年等（例: 3年生、主任）★v1.13: age(INTEGER)から変更
  preferred_communication TEXT CHECK(preferred_communication IN ('email','chat','in_person')),
  updated_at              TEXT,
  created_at              TEXT NOT NULL DEFAULT (DATETIME('now'))
);
```

### refresh_tokens

```sql
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id),
  token_hash  TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  revoked     INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (DATETIME('now'))
);
```

### organizations

```sql
CREATE TABLE IF NOT EXISTS organizations (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  code       TEXT UNIQUE,
  is_active  INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (DATETIME('now'))
);
```

### user_organizations

```sql
CREATE TABLE IF NOT EXISTS user_organizations (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  assigned_at     TEXT NOT NULL DEFAULT (DATETIME('now')),
  UNIQUE(user_id, organization_id)
);
```

### assignments

```sql
CREATE TABLE IF NOT EXISTS assignments (
  id          TEXT PRIMARY KEY,
  patient_id  TEXT NOT NULL REFERENCES users(id),
  provider_id TEXT NOT NULL REFERENCES users(id),
  assigned_at TEXT NOT NULL DEFAULT (DATETIME('now')),
  UNIQUE(patient_id, provider_id)
);
```

### daily_logs

```sql
CREATE TABLE IF NOT EXISTS daily_logs (
  id                TEXT PRIMARY KEY,
  patient_id        TEXT NOT NULL REFERENCES users(id),
  logged_at         TEXT NOT NULL DEFAULT (DATETIME('now')),
  fever_score       INTEGER NOT NULL CHECK(fever_score BETWEEN 1 AND 10),
  steps_yesterday   TEXT NOT NULL CHECK(steps_yesterday IN (
                      'under_2000','2000_4000','4000_6000','6000_8000','over_8000'
                    )),
  condition         INTEGER NOT NULL CHECK(condition BETWEEN 1 AND 10),
  appetite_score    INTEGER NOT NULL CHECK(appetite_score BETWEEN 1 AND 10),
  sleep_quality     INTEGER NOT NULL CHECK(sleep_quality BETWEEN 1 AND 10),
  attention_score   INTEGER NOT NULL CHECK(attention_score BETWEEN 1 AND 10),
  note              TEXT,
  status            TEXT NOT NULL DEFAULT 'unchecked'
                      CHECK(status IN ('unchecked','checked','responded')),
  status_updated_by TEXT REFERENCES users(id),
  status_updated_at TEXT
);
```

- `fever_score`: 1（全く熱くない）〜 10（とても熱っぽい）
- `steps_yesterday`: TEXT選択式。選択肢: under_2000 / 2000_4000 / 4000_6000 / 6000_8000 / over_8000
- `condition`: INTEGER 1-5のみ使用（わくわく=5/楽しい=4/ふつう=3/しんどい=2/つらい=1）
- `appetite_score`: 1（食欲なし）〜 10（食欲満々）
- `sleep_quality`: 1（全く眠れなかった）〜 10（ぐっすり眠れた）
- `attention_score`: 1（全く構ってほしくない）〜 10（とても構ってほしい）

### medical_notes

```sql
CREATE TABLE IF NOT EXISTS medical_notes (
  id           TEXT PRIMARY KEY,
  daily_log_id TEXT NOT NULL REFERENCES daily_logs(id),
  provider_id  TEXT NOT NULL REFERENCES users(id),
  note         TEXT NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (DATETIME('now')),
  updated_at   TEXT
);
```

### consultation_topics

```sql
CREATE TABLE IF NOT EXISTS consultation_topics (
  id         TEXT PRIMARY KEY,
  label      TEXT NOT NULL,
  icon       TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active  INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (DATETIME('now'))
);
```

### ai_providers

```sql
CREATE TABLE IF NOT EXISTS ai_providers (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  provider_type TEXT NOT NULL CHECK(provider_type IN ('ollama','openai','dify')),
  endpoint      TEXT NOT NULL,
  api_key       TEXT,
  model         TEXT,
  active        INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (DATETIME('now'))
);
```

### ai_consultations

```sql
CREATE TABLE IF NOT EXISTS ai_consultations (
  id                   TEXT PRIMARY KEY,
  patient_id           TEXT NOT NULL REFERENCES users(id),
  ai_provider_id       TEXT NOT NULL REFERENCES ai_providers(id),
  topic_id             TEXT REFERENCES consultation_topics(id),
  dify_conversation_id TEXT,
  risk_level           TEXT CHECK(risk_level IN ('low','medium','high')),
  summary              TEXT,
  started_at           TEXT NOT NULL DEFAULT (DATETIME('now'))
);
```

### ai_messages

```sql
CREATE TABLE IF NOT EXISTS ai_messages (
  id              TEXT PRIMARY KEY,
  consultation_id TEXT NOT NULL REFERENCES ai_consultations(id),
  role            TEXT NOT NULL CHECK(role IN ('user','assistant')),
  content         TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (DATETIME('now'))
);
```

### api_keys

```sql
CREATE TABLE IF NOT EXISTS api_keys (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  key_hash     TEXT NOT NULL UNIQUE,
  is_active    INTEGER NOT NULL DEFAULT 1,
  last_used_at TEXT,
  created_by   TEXT NOT NULL REFERENCES users(id),
  created_at   TEXT NOT NULL DEFAULT (DATETIME('now')),
  expires_at   TEXT
);
```

### system_settings ★v1.13新規追加

```sql
CREATE TABLE IF NOT EXISTS system_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (DATETIME('now'))
);
```

初期データ:

| key | value |
|-----|-------|
| `system_prompt` | あなたは相談者の健康状態をサポートするAIアシスタントです。\n医師の診断や処方の代替は禁止です。症状が重い場合は必ず医師への相談を促してください。 |

---

## 6. API一覧

### 認証

| メソッド | パス | 説明 | 認証 |
|---------|------|------|------|
| POST | /auth/register | 患者セルフ登録 | 不要 |
| POST | /auth/login | ログイン | 不要 |
| POST | /auth/logout | リフレッシュトークン無効化 | JWT |
| POST | /auth/refresh | アクセストークン再発行 | refresh token |
| GET | /auth/me | 自分のユーザー情報取得 | JWT |
| POST | /auth/consent | 初回同意記録 | JWT |
| DELETE | /auth/consent | 同意の撤回 | JWT |

### ユーザー管理（admin）

| メソッド | パス | 説明 |
|---------|------|------|
| GET | /users | ユーザー一覧・検索 |
| POST | /users | ユーザー作成 |
| GET | /users/:id | ユーザー詳細 |
| PUT | /users/:id | ユーザー更新 |
| POST | /users/:id/reset-password | パスワード再設定 |

### 組織管理（admin）

| メソッド | パス | 説明 |
|---------|------|------|
| GET | /organizations | 組織一覧 |
| POST | /organizations | 組織作成 |
| GET | /organizations/:id | 組織詳細 |
| PUT | /organizations/:id | 組織更新 |
| DELETE | /organizations/:id | 組織削除 |
| GET | /organizations/:id/members | 組織メンバー一覧 |
| POST | /organizations/:id/members | メンバー追加 |
| DELETE | /organizations/:id/members/:userId | メンバー削除 |

### 担当割当（admin）

| メソッド | パス | 説明 |
|---------|------|------|
| GET | /assignments | 割当一覧 |
| POST | /assignments | 割当追加 |
| DELETE | /assignments/:id | 割当解除 |

### 体調ログ

| メソッド | パス | 説明 | 利用ロール |
|---------|------|------|-----------|
| GET | /daily-logs | 自分のログ一覧 | patient |
| POST | /daily-logs | 体調入力 | patient |
| GET | /daily-logs/:id | ログ詳細 | patient / doctor / nurse |
| PUT | /daily-logs/:id/status | ステータス更新 | doctor / nurse |
| GET | /daily-logs/:id/notes | メモ一覧 | doctor / nurse |
| POST | /daily-logs/:id/notes | メモ追加 | doctor / nurse |
| PUT | /daily-logs/:id/notes/:noteId | メモ更新 | doctor / nurse（作成者のみ） |

### 患者モニタリング（doctor / nurse）

| メソッド | パス | 説明 |
|---------|------|------|
| GET | /patients | 同一組織の患者一覧（所属組織名含む） |
| GET | /patients/:id | 患者詳細（所属組織名含む） |
| GET | /patients/:id/daily-logs | 患者の体調ログ一覧 |
| GET | /patients/:id/consultations | 患者のAI相談履歴一覧 |

### AI相談

| メソッド | パス | 説明 | 利用ロール |
|---------|------|------|-----------|
| POST | /ai/consultations | セッション開始（topic_id 任意） | patient |
| GET | /ai/consultations | 自分のセッション一覧 | patient |
| GET | /ai/consultations/:id | セッション詳細（メッセージ含む） | patient / doctor / nurse |
| POST | /ai/consultations/:id/messages | メッセージ送信（SSEストリーミング） | patient |
| POST | /ai/consultations/:id/summarize | 要約・危険度生成 | doctor / nurse |

### 相談トピック

| メソッド | パス | 説明 | 利用ロール |
|---------|------|------|-----------|
| GET | /consultation-topics | トピック一覧（is_active=1のみ） | 全員 |
| POST | /consultation-topics | トピック作成 | admin |
| PUT | /consultation-topics/:id | トピック更新 | admin |
| DELETE | /consultation-topics/:id | トピック削除 | admin |

### AI接続設定（admin）

| メソッド | パス | 説明 |
|---------|------|------|
| GET | /ai/providers | プロバイダ一覧 |
| POST | /ai/providers | プロバイダ追加 |
| PUT | /ai/providers/:id | プロバイダ更新 |
| DELETE | /ai/providers/:id | プロバイダ削除 |
| PUT | /ai/providers/:id/activate | アクティブ切り替え |

### システム設定（admin）★v1.13新規追加

| メソッド | パス | 説明 |
|---------|------|------|
| GET | /system-settings | 設定一覧取得 |
| PUT | /system-settings/:key | 設定値更新 |

### APIキー管理（admin）

| メソッド | パス | 説明 |
|---------|------|------|
| GET | /api-keys | APIキー一覧（key_hashは返さない） |
| POST | /api-keys | APIキー発行（生のキーを1回だけ返す） |
| PUT | /api-keys/:id | 名称・有効期限の更新 |
| DELETE | /api-keys/:id | APIキー失効（is_active=0） |

### 外部連携API（APIキー認証）

| メソッド | パス | 説明 |
|---------|------|------|
| GET | /external/patients | 患者一覧（consent_agreed=1のみ） |
| GET | /external/patients/:id | 患者詳細 |
| GET | /external/daily-logs | 体調ログ一覧 |
| GET | /external/daily-logs/:id | 体調ログ詳細 |
| GET | /external/consultations | AI相談セッション一覧 |
| GET | /external/consultations/:id | AI相談詳細（メッセージ含む） |

---

## 7. インフォームドコンセント設計

### 同意取得フロー（セルフ登録）

```
Step 1: /register          ユーザー名・メール・パスワード
Step 2: /register/profile  氏名・役職/学年・希望連絡方法
Step 3: /register/consent  4項目チェック → 全チェックで登録完了
```

### 同意画面に表示する4項目（consent_version: "1.0"）

| # | 項目名 | 表示内容 |
|---|-------|---------|
| 1 | AI相談ログの医療者閲覧 | AIとの相談内容を担当の医師・看護師が確認します。 |
| 2 | 体調データの研究利用 | 体調記録・AI相談内容は匿名化処理の上、医療研究に利用される場合があります。 |
| 3 | 個人情報の取り扱い | 登録情報は暗号化して保存されます。 |
| 4 | 同意の撤回 | 同意はいつでも撤回できます。 |

---

## 8. AI機能設計

### 8.1 プロバイダ抽象化

```typescript
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AIProvider {
  chat(messages: ChatMessage[], systemPrompt?: string): Promise<string>;
  stream(messages: ChatMessage[], systemPrompt?: string): AsyncIterable<string>;
}
```

対応プロバイダ: OllamaProvider / OpenAIProvider / DifyProvider

### 8.2 システムプロンプト管理 ★v1.13変更

- システムプロンプトは `system_settings` テーブルの `system_prompt` キーで管理
- ハードコードを廃止し、DBから動的に取得
- 管理画面（`/admin/system-settings`）から編集可能
- 初期値: 「あなたは相談者の健康状態をサポートするAIアシスタントです。\n医師の診断や処方の代替は禁止です。症状が重い場合は必ず医師への相談を促してください。」
- topic_id 指定時: 「相談カテゴリ: {topic.label}」をプロンプトに付加

### 8.3 SSEストリーミング

```
Content-Type: text/event-stream
data: {"delta": "chunk"}
data: [DONE]
```

フロントエンドは `fetch()` + `ReadableStream` で受信。

---

## 9. Swagger UI（OpenAPI 3.0）

- アクセスURL: `http://localhost:8080/api-docs`（認証不要）
- securitySchemes: `bearerAuth`（JWT）+ `apiKeyAuth`（X-API-Key）

---

## 10. 画面一覧

### 患者画面（スマートフォン縦型・MobileLayout）

| 画面 | パス | ヘッダータイトル |
|-----|------|----------------|
| ログイン | /login | — |
| 新規登録 | /register〜 | — |
| 初回同意 | /consent | — |
| ホーム | / | HealthLink |
| 体調入力 | /logs/new | 体調を記録する |
| 履歴 | /logs | 記録履歴 |
| AI相談一覧 | /consultations | AI相談 |
| AI相談チャット | /consultations/:id | AI相談 |
| 設定 | /settings/consent | 設定 |

- 全患者画面でフッターナビゲーション（ホーム・記録・AI相談・設定）を表示
- ヘッダーに戻るボタンは表示しない（フッターナビで画面遷移）

### 医療者画面（デスクトップ横型・DesktopLayout）

| 画面 | パス |
|-----|------|
| ダッシュボード | /dashboard |
| 患者詳細 | /patients/:id |

### 管理者画面（デスクトップ横型・DesktopLayout）

| 画面 | パス | 説明 |
|-----|------|------|
| ユーザー管理 | /admin/users | 一覧・作成・編集・ロール設定・position表示 |
| 組織管理 | /admin/organizations | 医療機関の追加・編集 |
| メンバー管理 | /admin/members | 全組織メンバー一覧（組織列付き）★v1.13追加 |
| 担当割当 | /admin/assignments | 主担当紐付け |
| 相談トピック管理 | /admin/consultation-topics | トピック追加・編集・並び替え |
| AI接続設定 | /admin/ai-providers | プロバイダ管理 |
| システム設定 | /admin/system-settings | AIシステムプロンプト管理 ★v1.13追加 |
| APIキー管理 | /admin/api-keys | 外部連携用APIキーの発行・失効 |

---

## 11. UI設計

### カラーパレット

| 用途 | カラーコード |
|-----|------------|
| Primary | `#4FB3A5` |
| Background | `#F7F9FA` |
| Card | `#FFFFFF` |
| Text | `#2C3E50` |
| Accent | `#6FA8DC` |

### バッジの色規則

| 状態 | 色 |
|-----|----|
| 対応済 / 有効 / low | 緑 |
| 確認済 | teal |
| 未確認 / medium | 黄 |
| 高リスク / 無効 / high | 赤 |

### コンディションラベル定数

```typescript
// frontend/src/constants/condition.ts
export const CONDITION_OPTIONS = [
  { value: 5, label: 'わくわく', emoji: '🌟' },
  { value: 4, label: '楽しい',   emoji: '😊' },
  { value: 3, label: 'ふつう',   emoji: '😐' },
  { value: 2, label: 'しんどい', emoji: '😔' },
  { value: 1, label: 'つらい',   emoji: '😢' },
] as const;
```

---

## 12. 起動・開発手順

### 前提条件

- Node.js 24 LTS + npm 10以上

### 起動コマンド

```bash
# バックエンド起動（ターミナル1）
cd backend
cp .env.example .env   # 初回のみ
npm install
npm run migrate        # DBスキーマ作成（初回のみ）
npm run dev            # → localhost:8080

# フロントエンド起動（ターミナル2）
cd frontend
cp .env.example .env   # 初回のみ
npm install
npm run dev            # → localhost:3000

# シードデータ投入（任意・LOAD_SEED_DATA=true に変更してから実行）
cd backend && npm run seed
```

### 一括起動・停止スクリプト ★v1.13追加

```bash
# Windows
.\start.ps1   # 起動
.\stop.ps1    # 停止

# Linux / Mac
./start.sh    # 起動
./stop.sh     # 停止
```

---

## 13. 非機能要件

| 項目 | 内容 |
|-----|------|
| アプリケーション名 | `VITE_APP_NAME` 環境変数。デフォルト: HealthLink |
| ロールラベル | `VITE_LABEL_PATIENT` / `VITE_LABEL_DOCTOR` / `VITE_LABEL_NURSE`（backend/frontend共通） |
| 研究利用ラベル | `VITE_LABEL_RESEARCH`（デフォルト: 医療研究）★v1.14追加 |
| 環境変数管理 | ルートの `.env` に統合。backend/frontend 両方が参照 ★v1.14追加 |
| タイムゾーン | `TZ=Asia/Tokyo` を `.env` に設定。DBはUTC保存。フロントエンドは `src/utils/date.ts` の `parseDbDate()` でUTC文字列をJSTに変換して表示 ★v1.15追加 |
| シードデータ | `LOAD_SEED_DATA=true` の場合のみ実行 |
| レスポンシブ | スマートフォン・PCの両対応 |
| パスワード | bcryptjs（`BCRYPT_ROUNDS` 環境変数、デフォルト10） |
| 内部認証 | JWT（アクセストークン15分 / リフレッシュトークン7日） |
| 外部連携認証 | APIキー（`X-API-Key` ヘッダー、SHA-256ハッシュをDBに保存） |
| AIレスポンス | SSEストリーミング |
| AIシステムプロンプト | `system_settings` テーブルで管理。管理画面から編集可能 ★v1.13 |
| AIプロバイダ未設定 | 503 `{ error: "AI_PROVIDER_UNAVAILABLE" }` |
| SQLite外部キー | 接続時に `PRAGMA foreign_keys = ON` を実行 |
| 運用スコープ | 1インスタンス = 1施設 |
| Swagger UI | `http://localhost:8080/api-docs` |
| インフラ | Docker不要。Node.js 24 + npm のみ |

---

## 14. ロールラベルカスタマイズ

### 施設種別ごとの設定例

| 施設種別 | VITE_LABEL_PATIENT | VITE_LABEL_DOCTOR | VITE_LABEL_NURSE | VITE_LABEL_RESEARCH |
|---------|--------------|--------------|-------------|
| 病院（デフォルト） | 患者 | 医師 | 看護師 | 医療研究 |
| 大学健康相談室 | 学生 | 相談員 | 保健スタッフ | 学術研究 |
| 企業健康管理室 | 社員 | 産業医 | 保健師 | 健康管理研究 |
| 訪問看護ステーション | 利用者 | 担当医 | 看護師 | 医療研究 |

### 実装ファイル

```
backend/src/config/labels.ts       — Labels オブジェクト
frontend/src/hooks/useLabels.ts    — useLabels() フック
```

---

## 15. 決定事項サマリー

| 項目 | 決定内容 |
|-----|---------|
| 運用モデル | 1インスタンス = 1施設 |
| DB | SQLite（better-sqlite3 v12.8.0以上） |
| DBファイル | `backend/data/healthlink.db` |
| Docker | 完全廃止 |
| Swagger UI | Phase 1から実装 |
| 外部連携認証 | APIキー（X-API-Key ヘッダー） |
| APIキー保存 | SHA-256ハッシュのみ。生キーは発行時1回のみ表示 |
| ロールラベル | env変数で変更可能 |
| `profiles.position` | TEXT・任意（役職・学年等）★v1.13: age(INTEGER)から変更 |
| `organizations` | 将来拡張用として保持（通常1レコード） |
| 体調入力必須項目 | コンディション（5択）/ 構ってスコア / 食欲 / 熱っぽさ / ぐっすり度 / 昨日の歩数 |
| 体調入力任意項目 | メモ（自由記述）のみ |
| AIシステムプロンプト | `system_settings` テーブルで管理。管理画面から編集可能 ★v1.13 |
| アクセス制御 | `user_organizations` の組織メンバーシップで制御 |
| シードデータ | `LOAD_SEED_DATA=true` の場合のみ実行 |

---

## 16. Phase 2（将来実装）

- ルートディレクトリの統合 `.env` によるbackend/frontend環境変数の一元管理（★v1.14で実装済み）
- 自動アラート・通知（危険度 high 時）
- 詳細分析ダッシュボード（グラフ・トレンド・異常検知）
- 外部連携APIへのWebhook対応
- **スケールアウト時: PostgreSQLへの移行**
