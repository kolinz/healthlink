# 実装プロンプト集
# 患者体調共有・AI相談ポータル（Phase 1）

**対象SDD:** SDD_patient_portal_phase1_v1_15.md
**対応ツール:** Claude.ai / Claude Code

### 変更履歴

| バージョン | 更新日 | 主な変更内容 |
|-----------|--------|------------|
| 1.2 | 2025-03-31 | 初版 |
| 1.3 | 2025-05-06 | 組織管理・相談トピック・SSEストリーミング・アクセス制御を反映。 |
| 1.6 | 2026-06-09 | Docker廃止・SQLite移行・Swagger UI Phase 1昇格・外部連携API・APIキー管理を反映。 |
| 1.7 | 2026-06-10 | ロールラベルカスタマイズ機能を反映。 |
| 1.8 | 2026-06-10 | 体調入力項目再設計を反映。 |
| 1.9 | 2026-06-10 | attention_score 追加を反映。 |
| 1.10 | 2026-06-10 | condition の5択UI・ラベル定数を反映。 |
| 1.11 | 2026-06-10 | gemini→openai 差し替えを反映。 |
| 1.12 | 2026-06-10 | fever_score・steps_yesterday 変更を反映。 |
| 1.13 | 2026-06-13 | age→position 変更。system_settings 追加。メンバー管理・システム設定画面追加。 |
| 1.14 | 2026-06-13 | 環境変数をルート .env に統合。VITE_LABEL_RESEARCH 追加。同意画面の文言動的化。相談トピック初期値変更。 |
| 1.15 | 2026-06-13 | タイムゾーン対応。date.ts ユーティリティ追加。DEPLOYMENT.md に変更。 |

---

## 凡例

| マーク | 意味 |
|-------|------|
| 🌐 | Claude.ai（チャット）向け |
| 💻 | Claude Code（CLI）向け |
| 🔁 | 両方で使用可 |
| 📎 | SDDファイルを添付して実行 |

プロンプトは **そのままコピペして使用** できます。
`【 】` で囲まれた部分は状況に応じて書き換えてください。

> **【厳守】ファイル出力ルール:**
> 複数ファイルを生成する場合は、**ZIPやアーカイブにまとめることを禁止** します。
> **1ファイルずつ個別に作成・出力** してください。
> 次のファイルに進む前に「続けてください」と指示してください。

---

## Phase 0 — コンテキスト設定

### P0-1 🔁📎 SDDを読み込ませる（全フェーズ共通の最初の一手）

```
添付のSDD仕様書（SDD_patient_portal_phase1_v1_15.md）を読み込んでください。

これから、この仕様書に基づいてシステムを段階的に実装します。
各フェーズで指示を出すので、まず仕様書全体を把握してください。
仕様書の内容をそのまま実装します。

技術スタック:
- バックエンド: Node.js 24 LTS / TypeScript / Express
- DB: SQLite（better-sqlite3 v12.8.0以上）
- フロントエンド: React / TypeScript / Tailwind CSS / shadcn/ui / Vite
- 状態管理: Zustand
- AIレスポンス: SSE（Server-Sent Events）ストリーミング
- API仕様: OpenAPI 3.0 / swagger-jsdoc + swagger-ui-express
- インフラ: なし（npm直接起動）

重要な設計方針:
- 1インスタンス = 1施設で運用する
- 施設間・外部システム連携は /external/* エンドポイント + APIキー認証で行う
- Docker は使用しない
- 環境変数はルートディレクトリの .env に統合する（backend/.env / frontend/.env は使用しない）
- タイムゾーン: DBはUTC保存。フロントエンドは src/utils/date.ts の parseDbDate() でJSTに変換する
```

---

## Phase 1 — プロジェクト構成

### P1-1 💻 プロジェクト構造を生成する

```
以下の構成でプロジェクトのディレクトリ構造とファイルを作成してください。

## ディレクトリ構成

healthlink/
├── .env.example             ← ルート統合環境変数サンプル ★v1.14
├── .gitignore
├── start.ps1 / stop.ps1     ← Windows 起動・停止スクリプト ★v1.13
├── start.sh / stop.sh       ← Linux/Mac 起動・停止スクリプト ★v1.13
├── docs/
│   ├── DEPLOYMENT.md        ← セットアップ・動作確認手順書 ★v1.15
│   └── SDD_patient_portal_phase1_v1_15.md
├── backend/
│   ├── data/                ← SQLiteファイル保存先（.gitignoreに追加）
│   ├── src/
│   │   ├── index.ts
│   │   ├── config/
│   │   │   ├── labels.ts    ← ロールラベル設定 ★v1.7
│   │   │   └── swagger/
│   │   │       ├── swaggerConfig.ts
│   │   │       └── index.ts
│   │   ├── db/
│   │   │   ├── client.ts
│   │   │   ├── migrate.ts
│   │   │   ├── seed.ts
│   │   │   └── schema.sql
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   ├── consent.ts
│   │   │   ├── role.ts
│   │   │   └── apiKey.ts
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── users.ts
│   │   │   ├── organizations.ts
│   │   │   ├── assignments.ts
│   │   │   ├── dailyLogs.ts
│   │   │   ├── patients.ts
│   │   │   ├── ai.ts
│   │   │   ├── aiProviders.ts
│   │   │   ├── consultationTopics.ts
│   │   │   ├── apiKeys.ts
│   │   │   ├── external.ts
│   │   │   └── systemSettings.ts  ← システム設定API ★v1.13
│   │   ├── services/
│   │   │   ├── aiProviders.ts
│   │   │   └── orgAccess.ts
│   │   └── types/
│   │       └── index.ts
│   ├── .gitignore
│   ├── package.json
│   └── tsconfig.json
└── frontend/
    ├── src/
    │   ├── main.tsx
    │   ├── App.tsx
    │   ├── api/
    │   │   ├── client.ts
    │   │   ├── sse.ts
    │   │   ├── auth.ts
    │   │   ├── dailyLogs.ts
    │   │   ├── consultations.ts
    │   │   ├── patients.ts
    │   │   └── admin.ts
    │   ├── components/
    │   │   ├── ui/
    │   │   └── layout/
    │   ├── constants/
    │   │   └── condition.ts
    │   ├── hooks/
    │   │   └── useLabels.ts
    │   ├── pages/
    │   ├── store/
    │   │   └── authStore.ts
    │   ├── utils/
    │   │   └── date.ts      ← タイムゾーン変換ユーティリティ ★v1.15
    │   └── types/
    │       └── index.ts
    ├── .gitignore
    ├── package.json
    ├── tsconfig.json
    └── vite.config.ts       ← envDir: '..' を設定すること ★v1.14

## backend/package.json に含めるパッケージ

dependencies:
  express, better-sqlite3@^12.8.0, bcryptjs, jsonwebtoken, cors, helmet, morgan,
  dotenv, uuid, swagger-jsdoc, swagger-ui-express

devDependencies:
  typescript, @types/express, @types/better-sqlite3, @types/bcryptjs,
  @types/jsonwebtoken, @types/cors, @types/morgan, @types/uuid,
  @types/swagger-jsdoc, @types/swagger-ui-express,
  ts-node-dev, ts-node, eslint

※ `bcrypt`（ネイティブモジュール）ではなく必ず `bcryptjs` を使用すること
※ `pg` は含めない（SQLite構成のため）
※ `better-sqlite3` は v12.8.0 以上（Node.js 24対応）を使用すること

## frontend/package.json に含めるパッケージ

dependencies:
  react, react-dom, react-router-dom, axios, zustand,
  @radix-ui/react-*, tailwindcss, lucide-react, clsx

devDependencies:
  vite, typescript, @vitejs/plugin-react, eslint

## npm scripts（backend）

"dev":           "ts-node-dev --respawn --transpile-only src/index.ts"
"build":         "tsc"
"start":         "node dist/index.js"
"migrate":       "ts-node src/db/migrate.ts"
"migrate:fresh": "ts-node src/db/migrate.ts --fresh"
"seed":          "ts-node src/db/seed.ts"

【厳守】ZIPファイルやアーカイブにまとめて出力することは禁止です。
必ず1ファイルずつ個別に作成・出力してください。
```

---

### P1-2 💻 環境変数ファイルを生成する ★v1.14更新

```
以下の環境変数ファイルを作成してください。

## ルート .env.example（★v1.14: backend/.env / frontend/.env を統合）

# ============================================================
# HealthLink 統合環境変数サンプル
# cp .env.example .env で作成してください
# ============================================================

# ---- アプリケーション ----
VITE_APP_NAME=HealthLink
NODE_ENV=development

# ---- タイムゾーン ----
TZ=Asia/Tokyo

# ---- バックエンド ----
PORT=8080
DATABASE_PATH=./backend/data/healthlink.db
CORS_ORIGIN=http://localhost:3000

# ---- JWT ----
JWT_ACCESS_SECRET=change_me_access_secret_min_32chars
JWT_REFRESH_SECRET=change_me_refresh_secret_min_32chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ---- セキュリティ ----
BCRYPT_ROUNDS=10

# ---- シードデータ（本番では必ず false） ----
LOAD_SEED_DATA=false

# ---- フロントエンド ----
VITE_API_URL=http://localhost:8080

# ---- ロールラベル（backend / frontend 共通） ----
VITE_LABEL_PATIENT=患者
VITE_LABEL_DOCTOR=医師
VITE_LABEL_NURSE=看護師

# ---- 研究利用ラベル ★v1.14 ----
VITE_LABEL_RESEARCH=医療研究

## ルート .gitignore

.env
node_modules/
*.log
.backend.pid
.frontend.pid

## backend/.gitignore

data/
node_modules/
dist/
*.log

## frontend/.gitignore

node_modules/
dist/
*.log

上記3ファイルを1ファイルずつ作成してください。
```

---

### P1-3 💻 ラベル設定ファイルを生成する ★v1.14更新

```
以下のファイルを作成してください。

## backend/src/config/labels.ts（★v1.14: VITE_LABEL_* に統一）

// ロールラベル設定
// ルートの .env から VITE_LABEL_* を読み込む（frontend と共通）
export const Labels = {
  patient: process.env.VITE_LABEL_PATIENT ?? '患者',
  doctor:  process.env.VITE_LABEL_DOCTOR  ?? '医師',
  nurse:   process.env.VITE_LABEL_NURSE   ?? '看護師',
  admin:   '管理者',
} as const;

## frontend/src/hooks/useLabels.ts

export function useLabels() {
  return {
    patient:  import.meta.env.VITE_LABEL_PATIENT  ?? '患者',
    doctor:   import.meta.env.VITE_LABEL_DOCTOR   ?? '医師',
    nurse:    import.meta.env.VITE_LABEL_NURSE     ?? '看護師',
    admin:    '管理者',
    research: import.meta.env.VITE_LABEL_RESEARCH ?? '医療研究',
  } as const;
}

## frontend/src/utils/date.ts（★v1.15新規）

// SQLiteのUTC文字列をJSTに変換するユーティリティ
// SQLiteの DATETIME('now') は "2026-06-13 02:15:05"（Zなし）形式を返す
// Zなし文字列はブラウザがローカル時間として誤解するため明示的にUTCとして解釈させる

export function parseDbDate(str: string | null | undefined): Date | null {
  if (!str) return null;
  if (str.includes('T') && str.endsWith('Z')) return new Date(str);
  return new Date(str.replace(' ', 'T') + 'Z');
}

export function formatDate(
  str: string | null | undefined,
  options: Intl.DateTimeFormatOptions = {}
): string {
  const date = parseDbDate(str);
  if (!date) return '—';
  return date.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', ...options });
}

export function formatDateTime(str: string | null | undefined): string {
  return formatDate(str, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatDateTimeFull(str: string | null | undefined): string {
  return formatDate(str, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function formatDateOnly(str: string | null | undefined): string {
  return formatDate(str, { month: 'short', day: 'numeric', weekday: 'short' });
}

export function formatDateShort(str: string | null | undefined): string {
  return formatDate(str, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

## 出力ファイル
【厳守】以下のファイルをZIPにまとめず、1ファイルずつ順番に作成してください。
- backend/src/config/labels.ts
- frontend/src/hooks/useLabels.ts
- frontend/src/utils/date.ts
```

---

## Phase 2 — データベース

### P2-1 🔁📎 SQLiteスキーマを生成する ★v1.13更新

```
添付のSDD（セクション5: データベース設計）に基づいて、
SQLiteのDDLスキーマファイルを作成してください。

## 配置先: backend/src/db/schema.sql

## 注意事項

- ENUM → TEXT + CHECK(col IN (...)) で代替
- BOOLEAN → INTEGER（0/1）で代替
- UUID → アプリ側（uuid パッケージ）で生成してTEXTとして保存
- タイムスタンプ → TEXT（ISO 8601: DATETIME('now')）
- DECIMAL → REAL
- 接続時に PRAGMA foreign_keys = ON と PRAGMA journal_mode = WAL を実行すること（schema.sql ではなく client.ts で実行）
- CREATE TABLE IF NOT EXISTS を使用すること（冪等性）

## テーブル一覧（全テーブルを実装すること）

users / profiles / refresh_tokens / organizations / user_organizations /
assignments / daily_logs / medical_notes / consultation_topics /
ai_providers / ai_consultations / ai_messages / api_keys / system_settings

## profiles テーブルの注意点（★v1.13変更）

- age（INTEGER）は廃止。代わりに position（TEXT）を使用すること
- position: 役職・学年等（例: 3年生、主任）

## daily_logs テーブルの注意点

- fever_score: INTEGER NOT NULL CHECK(fever_score BETWEEN 1 AND 10)
- steps_yesterday: TEXT NOT NULL CHECK(steps_yesterday IN ('under_2000','2000_4000','4000_6000','6000_8000','over_8000'))
- condition: INTEGER NOT NULL CHECK(condition BETWEEN 1 AND 10)
- appetite_score: INTEGER NOT NULL CHECK(appetite_score BETWEEN 1 AND 10)
- sleep_quality: INTEGER NOT NULL CHECK(sleep_quality BETWEEN 1 AND 10)
- attention_score: INTEGER NOT NULL CHECK(attention_score BETWEEN 1 AND 10)

## system_settings テーブル（★v1.13新規）

CREATE TABLE IF NOT EXISTS system_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (DATETIME('now'))
);

インデックスも適切に作成すること。
```

---

### P2-2 💻 DBクライアント・マイグレーション・シードを生成する ★v1.14更新

```
以下のファイルを作成してください。

## 共通の注意事項

- dotenv の読み込みパス: `path.resolve(process.cwd(), '../.env')` を使用すること（★v1.14: ルートの .env を参照）
- DATABASE_PATH の解決: `path.resolve(process.cwd(), '..', process.env.DATABASE_PATH ?? 'backend/data/healthlink.db')` を使用すること
  （process.cwd() は backend/ を指すため、ルートからの相対パスを解決するために '../' を付加する）
- better-sqlite3 は同期API。async/await と混在させないこと

## backend/src/db/client.ts

- dotenv をルートの .env から読み込む
- DATABASE_PATH をルート相対パスとして解決する
- PRAGMA foreign_keys = ON
- PRAGMA journal_mode = WAL
- 接続完了ログを出力する

## backend/src/db/migrate.ts

- --fresh オプションで既存DBを削除して再作成
- schema.sql を読み込んで db.exec() で実行
- dotenv・DATABASE_PATH はルート参照

## backend/src/db/seed.ts

- LOAD_SEED_DATA !== 'true' の場合はスキップ
- 投入データ:
  - users: admin / suzuki(doctor) / tamura(nurse) / yamada(patient)
  - profiles: position フィールドを使用すること（age は廃止）★v1.13
  - organizations: サンプル病院（HOSP001）
  - user_organizations: 3件（suzuki / tamura / yamada）
  - assignments: 2件（yamada → suzuki / yamada → tamura）
  - daily_logs: yamada の過去7日分（fever_score / steps_yesterday / condition / appetite_score / sleep_quality / attention_score を含む）
  - consultation_topics: 体調 / 生活 / 学業 / その他（★v1.14: 薬機法配慮で変更）
  - ai_providers: Ollama（active=1）
  - system_settings: system_prompt（初期プロンプト）★v1.13
    値: 'あなたは相談者の健康状態をサポートするAIアシスタントです。\n医師の診断や処方の代替は禁止です。症状が重い場合は必ず医師への相談を促してください。'

【厳守】以下のファイルをZIPにまとめず、1ファイルずつ順番に作成してください。
- backend/src/db/client.ts
- backend/src/db/migrate.ts
- backend/src/db/seed.ts
```

---

## Phase 3 — バックエンドAPI

### P3-1 💻 認証APIを実装する

```
添付のSDD（セクション4: 認証仕様、セクション7: インフォームドコンセント）に基づいて、
認証APIを実装してください。

## 配置先: backend/src/routes/auth.ts

## 実装するエンドポイント

POST /auth/register    — 患者セルフ登録（3ステップ同意フロー）
POST /auth/login       — ログイン（JWT発行）
POST /auth/logout      — リフレッシュトークン無効化
POST /auth/refresh     — アクセストークン再発行
GET  /auth/me          — ログイン中ユーザー情報取得
POST /auth/consent     — 初回同意記録
DELETE /auth/consent   — 同意撤回

## 注意事項

- bcryptjs を使用すること（bcrypt ではない）
- BCRYPT_ROUNDS は環境変数から取得
- JWT_ACCESS_SECRET / JWT_REFRESH_SECRET は環境変数から取得
- profiles テーブルは position（TEXT）を使用すること（age は廃止）★v1.13
- /auth/me は p.position を SELECT すること
- 全エンドポイントに @openapi JSDoc コメントを付与すること
- Swagger JSDoc の preferred_communication プロパティは複数行形式で記述すること:
  preferred_communication:
    type: string
    enum: [email, chat, in_person]
  （インライン形式 preferred_communication:{ type: string, enum: [...] } はYAMLエラーになるため禁止）

## ミドルウェアも同時に作成

- backend/src/middleware/auth.ts     — JWT検証・req.user セット
- backend/src/middleware/consent.ts  — consent_agreed チェック
- backend/src/middleware/role.ts     — requireRole(...roles) ファクトリ

【厳守】以下のファイルをZIPにまとめず、1ファイルずつ順番に作成してください。
- backend/src/middleware/auth.ts
- backend/src/middleware/consent.ts
- backend/src/middleware/role.ts
- backend/src/routes/auth.ts
```

---

### P3-2 💻 ユーザー管理・担当割当APIを実装する ★v1.13更新

```
添付のSDDに基づいて、ユーザー管理・担当割当APIを実装してください。

## 配置先

- backend/src/routes/users.ts
- backend/src/routes/assignments.ts

## users.ts の注意事項

- profiles テーブルは position（TEXT）を使用すること（age は廃止）★v1.13
- GET /users: p.position を SELECT すること
- POST /users: position パラメータを受け取ること
- PUT /users/:id: position パラメータを更新できること
- 全エンドポイントに @openapi JSDoc コメントを付与すること

【厳守】以下のファイルをZIPにまとめず、1ファイルずつ順番に作成してください。
- backend/src/routes/users.ts
- backend/src/routes/assignments.ts
```

---

### P3-3 💻 組織管理APIを実装する

```
添付のSDDに基づいて、組織管理APIを実装してください。

## 配置先: backend/src/routes/organizations.ts

## 実装するエンドポイント

GET    /organizations
POST   /organizations
GET    /organizations/:id
PUT    /organizations/:id
DELETE /organizations/:id
GET    /organizations/:id/members
POST   /organizations/:id/members
DELETE /organizations/:id/members/:userId

全エンドポイントに @openapi JSDoc コメントを付与すること。

【厳守】ZIPにまとめず1ファイルずつ作成してください。
```

---

### P3-4 💻 体調ログAPIを実装する

```
添付のSDDに基づいて、体調ログAPIを実装してください。

## 配置先

- backend/src/routes/dailyLogs.ts
- backend/src/routes/patients.ts

## daily_logs の必須フィールド（全て INTEGER 1-10）

fever_score / steps_yesterday（TEXT 5択）/ condition / appetite_score / sleep_quality / attention_score

## patients.ts の注意事項（★v1.13更新）

- GET /patients および GET /patients/:id のレスポンスに organization_name を含めること
- p.position を SELECT すること（age は廃止）
- orgAccess.checkSameOrg() で同一組織チェックを実装すること

## services/orgAccess.ts も同時に作成

- checkSameOrg(providerId, patientId): boolean

全エンドポイントに @openapi JSDoc コメントを付与すること。

【厳守】以下のファイルをZIPにまとめず、1ファイルずつ順番に作成してください。
- backend/src/services/orgAccess.ts
- backend/src/routes/dailyLogs.ts
- backend/src/routes/patients.ts
```

---

### P3-5 💻 AI相談APIを実装する ★v1.13更新

```
添付のSDDに基づいて、AI相談APIを実装してください。

## 配置先

- backend/src/routes/ai.ts
- backend/src/routes/aiProviders.ts
- backend/src/routes/consultationTopics.ts
- backend/src/services/aiProviders.ts

## ai.ts の注意事項（★v1.13更新）

- システムプロンプトは system_settings テーブルの system_prompt キーから取得すること
  （ハードコード禁止。DBから動的に読み込む）
- system_prompt が未設定の場合のフォールバック:
  'あなたは相談者の健康状態をサポートするAIアシスタントです。\n医師の診断や処方の代替は禁止です。症状が重い場合は必ず医師への相談を促してください。'
- topic_id 指定時は「相談カテゴリ: {topic.label}」をプロンプトに付加する
- active=1 のプロバイダが存在しない場合: 503 { error: "AI_PROVIDER_UNAVAILABLE" }

## aiProviders.ts の注意事項

- provider_type: 'ollama' | 'openai' | 'dify'（'gemini' は使用しない）
- OpenAIProvider: endpoint + api_key + model で接続
- model 未指定時のデフォルト: gpt-5-nano
- ルートは /ai/providers（/ai-providers ではない）

## SSEストリーミング

- POST /ai/consultations/:id/messages は text/event-stream で返す
- data: {"delta": "chunk"} 形式
- data: [DONE] でストリーム終了
- ストリーム完了後に ai_messages テーブルに全文保存

全エンドポイントに @openapi JSDoc コメントを付与すること。

【厳守】以下のファイルをZIPにまとめず、1ファイルずつ順番に作成してください。
- backend/src/services/aiProviders.ts
- backend/src/routes/consultationTopics.ts
- backend/src/routes/aiProviders.ts
- backend/src/routes/ai.ts
```

---

### P3-6 💻 APIキー管理・外部連携APIを実装する

```
添付のSDDに基づいて、APIキー管理・外部連携APIを実装してください。

## 配置先

- backend/src/middleware/apiKey.ts
- backend/src/routes/apiKeys.ts
- backend/src/routes/external.ts

## 注意事項

- APIキー生成: crypto.randomBytes(32).toString('hex')
- DBには SHA-256 ハッシュのみ保存（生キーはレスポンスに1回のみ含める）
- 外部連携APIでも consent_agreed=0 の患者データは返さないこと
- ページネーション: limit デフォルト50・最大200
- レスポンス形式: { data: [...], pagination: { page, limit, total, totalPages } }

全エンドポイントに @openapi JSDoc コメントを付与すること。

【厳守】以下のファイルをZIPにまとめず、1ファイルずつ順番に作成してください。
- backend/src/middleware/apiKey.ts
- backend/src/routes/apiKeys.ts
- backend/src/routes/external.ts
```

---

### P3-7 💻 システム設定API・Expressエントリポイントを実装する ★v1.13更新

```
添付のSDDに基づいて、システム設定APIとExpressエントリポイントを実装してください。

## backend/src/routes/systemSettings.ts（★v1.13新規）

GET  /system-settings       — 設定一覧取得（admin）
PUT  /system-settings/:key  — 設定値更新（admin）

全エンドポイントに @openapi JSDoc コメントを付与すること。

## backend/src/index.ts（★v1.14更新）

- dotenv の読み込み: path.resolve(process.cwd(), '../.env')
- 登録するルート:
  /auth / /users / /organizations / /assignments / /daily-logs / /patients /
  /ai / /ai/providers / /consultation-topics / /api-keys / /external / /system-settings
- Swagger UI: /api-docs（認証不要）

## backend/src/config/swagger/swaggerConfig.ts

- securitySchemes: bearerAuth（JWT）+ apiKeyAuth（X-API-Key）
- タグ: 認証 / ユーザー管理 / 組織管理 / 担当割当 / 体調ログ / 患者モニタリング /
        AI相談 / 相談トピック / AI接続設定 / システム設定 / APIキー管理 / 外部連携API

【厳守】以下のファイルをZIPにまとめず、1ファイルずつ順番に作成してください。
- backend/src/routes/systemSettings.ts
- backend/src/config/swagger/swaggerConfig.ts
- backend/src/config/swagger/index.ts
- backend/src/index.ts
```

---

## Phase 4 — フロントエンド

### P4-1 💻 APIクライアント・SSE・ルーティング基盤を実装する ★v1.14更新

```
添付のSDDに基づいて、フロントエンドの基盤を実装してください。

## frontend/vite.config.ts（★v1.14更新）

- envDir: path.resolve(__dirname, '..') を設定すること
  （ルートの .env を参照するため）
- server.port: 3000

## frontend/src/api/client.ts

- baseURL: import.meta.env.VITE_API_URL
- 401 時のリフレッシュインターセプター
- /auth/login / /auth/register / /auth/refresh への401はリフレッシュをスキップすること

## frontend/src/api/sse.ts

- fetch() + ReadableStream で SSE 受信（EventSource は POST 非対応のため使用禁止）
- コールバック: onDelta / onDone / onError

## frontend/src/store/authStore.ts

- isLoading の初期値: !!localStorage.getItem('accessToken')
  （ページリロード時に restoreSession 完了前に ProtectedRoute が /login へリダイレクトするのを防ぐ）
- restoreSession: /auth/me を叩いてセッション復元
- login: レスポンスの user を store にセット

## frontend/src/App.tsx

- 患者画面: MobileLayout でラップ（showBack は使用しない・フッターナビで画面遷移）
- 医療者/admin画面: DesktopLayout でラップ
- useEffect の依存配列は空（[]）にすること（restoreSession の多重実行防止）

【厳守】以下のファイルをZIPにまとめず、1ファイルずつ順番に作成してください。
- frontend/vite.config.ts
- frontend/src/api/client.ts
- frontend/src/api/sse.ts
- frontend/src/store/authStore.ts
- frontend/src/App.tsx
```

---

### P4-2 💻 ログイン・新規登録画面を実装する

```
添付のSDDに基づいて、認証画面を実装してください。

## 実装する画面

- LoginPage（/login）
- RegisterPage（/register, /register/profile, /register/consent）

## LoginPage の注意事項

- login() 完了後は useAuthStore.getState() で最新の state を同期的に取得すること
- ロールと consent_agreed に基づいて遷移先を決定:
  patient + consent_agreed=1 → /
  patient + consent_agreed=0 → /consent
  doctor / nurse → /dashboard
  admin → /admin/users

【厳守】以下のファイルをZIPにまとめず、1ファイルずつ順番に作成してください。
- frontend/src/pages/LoginPage.tsx
- frontend/src/pages/RegisterPage.tsx
```

---

### P4-3 💻 同意・撤回画面を実装する ★v1.14更新

```
添付のSDDに基づいて、同意・撤回画面を実装してください。

## ConsentPage（/consent）（★v1.14更新）

同意項目の文言を環境変数から動的に生成すること:
- import.meta.env.VITE_LABEL_DOCTOR / VITE_LABEL_NURSE → 「担当の{doctor}・{nurse}が確認します」
- import.meta.env.VITE_LABEL_RESEARCH → 「{research}に利用される場合があります」

## ConsentSettingsPage（/settings/consent）

- 同意状況表示（ステータス / 同意文書バージョン / 同意日時）
- 日時表示は formatDateTimeFull() を使用すること（★v1.15）
- 同意撤回ボタン + 確認モーダル
- ログアウトボタン（アカウントセクション）

【厳守】以下のファイルをZIPにまとめず、1ファイルずつ順番に作成してください。
- frontend/src/pages/ConsentPage.tsx
- frontend/src/pages/ConsentSettingsPage.tsx
```

---

### P4-4 💻 患者向け画面を実装する ★v1.15更新

```
添付のSDDに基づいて、患者向け画面を実装してください。

## 実装する画面

- PatientHomePage（/）
- HealthInputPage（/logs/new）
- HistoryPage（/logs）

## 共通注意事項（★v1.15）

- 日時表示は必ず frontend/src/utils/date.ts の関数を使用すること
  - formatDateTimeFull(): 年月日時分
  - formatDateShort(): 月日時分
  - formatDateOnly(): 月日（曜日）
- new Date(str).toLocaleString() を直接使用しないこと（UTCとして解釈されないため）

## PatientHomePage の注意事項

- getDailyLogs() の結果を logged_at の降順でソートすること
- MobileLayout はヘッダーのみ使用（showBack なし）

## HealthInputPage の注意事項

- condition は range slider ではなく CONDITION_OPTIONS の5択ボタンUI
- 内部にヘッダーを直書きしないこと（MobileLayout のヘッダーを使用）

## HistoryPage の注意事項

- 内部にヘッダーを直書きしないこと

【厳守】以下のファイルをZIPにまとめず、1ファイルずつ順番に作成してください。
- frontend/src/pages/PatientHomePage.tsx
- frontend/src/pages/HealthInputPage.tsx
- frontend/src/pages/HistoryPage.tsx
```

---

### P4-5 💻 AI相談画面を実装する ★v1.15更新

```
添付のSDDに基づいて、AI相談画面を実装してください。

## 実装する画面

- ConsultationListPage（/consultations）
- ConsultationChatPage（/consultations/:id）

## 共通注意事項（★v1.15）

- 日時表示は frontend/src/utils/date.ts の formatDateTimeFull() を使用すること

## ConsultationListPage の注意事項

- 内部にヘッダーを直書きしないこと
- FABボタン（右下固定）からボトムシートでトピック選択

## ConsultationChatPage の注意事項

- 内部にヘッダーを直書きしないこと
- SSEは fetch() + ReadableStream で実装（EventSource 禁止）

【厳守】以下のファイルをZIPにまとめず、1ファイルずつ順番に作成してください。
- frontend/src/pages/ConsultationListPage.tsx
- frontend/src/pages/ConsultationChatPage.tsx
```

---

### P4-6 💻 医療者向け画面を実装する ★v1.13・v1.15更新

```
添付のSDDに基づいて、医療者向け画面を実装してください。

## 実装する画面

- DashboardPage（/dashboard）
- PatientDetailPage（/patients/:id）

## 共通注意事項（★v1.15）

- 日時表示は frontend/src/utils/date.ts の関数を使用すること

## DashboardPage の注意事項（★v1.13更新）

- 患者一覧に organization_name 列を追加すること
- position が設定されている場合は患者名の下に表示する
- 内部にサイドバーを直書きしないこと（DesktopLayout を使用）
- ロールラベルは useLabels() 経由で参照すること

## PatientDetailPage の注意事項（★v1.13更新）

- 体調履歴テーブルに全項目を表示すること:
  日時 / コンディション / 構ってスコア / 食欲 / 熱っぽさ / 歩数 / ぐっすり度 / ステータス / 操作
- 患者ヘッダーに position と organization_name を表示すること
- condition は conditionLabel() でラベルに変換すること（数値のまま表示禁止）
- 内部にサイドバーを直書きしないこと

【厳守】以下のファイルをZIPにまとめず、1ファイルずつ順番に作成してください。
- frontend/src/pages/DashboardPage.tsx
- frontend/src/pages/PatientDetailPage.tsx
```

---

### P4-7 💻 管理者向け画面を実装する ★v1.13更新

```
添付のSDDに基づいて、管理者向け画面を実装してください。

## 実装する画面

- UserManagementPage（/admin/users）
- OrganizationPage（/admin/organizations）
- OrgMembersPage（/admin/organizations/:id/members）
- AdminMembersPage（/admin/members）★v1.13新規
- AssignmentPage（/admin/assignments）
- ConsultationTopicsPage（/admin/consultation-topics）
- AIProviderPage（/admin/ai-providers）
- SystemSettingsPage（/admin/system-settings）★v1.13新規

## UserManagementPage の注意事項（★v1.13更新）

- age フィールドは廃止。position（役職・学年）フィールドを使用すること
- 一覧テーブルに position 列を表示すること
- 作成・編集モーダルに position 入力フィールドを追加すること

## AdminMembersPage の注意事項（★v1.13新規）

- 全組織のメンバーを一覧表示（organization_name 列付き）
- メンバー追加（ユーザー検索 → 組織選択 → 追加）
- メンバー削除（確認モーダル付き）

## AIProviderPage の注意事項

- ルートは /ai/providers（/ai-providers ではない）
- モデルセレクト: gpt-5-nano（デフォルト）/ gpt-4o / gpt-4o-mini / その他（直接入力）
- OpenAI のエンドポイントは https://api.openai.com/v1 を使用すること
  （/chat/completions は OpenAIProvider が自動で付加する）

## SystemSettingsPage の注意事項（★v1.13新規）

- GET /system-settings でプロンプトを取得して表示
- テキストエリアで編集 → PUT /system-settings/system_prompt で保存
- 薬機法注意バナーを表示すること
- デフォルトに戻すボタンを実装すること

全画面で内部サイドバーを直書きしないこと（DesktopLayout を使用）

【厳守】以下のファイルをZIPにまとめず、1ファイルずつ順番に作成してください。
- frontend/src/pages/UserManagementPage.tsx
- frontend/src/pages/OrganizationPage.tsx
- frontend/src/pages/OrgMembersPage.tsx
- frontend/src/pages/AdminMembersPage.tsx
- frontend/src/pages/AssignmentPage.tsx
- frontend/src/pages/ConsultationTopicsPage.tsx
- frontend/src/pages/AIProviderPage.tsx
- frontend/src/pages/SystemSettingsPage.tsx
- frontend/src/api/admin.ts
```

---

### P4-8 💻 APIキー管理画面を実装する

```
添付のSDDに基づいて、APIキー管理画面を実装してください。

## ApiKeyPage（/admin/api-keys）（★v1.15更新）

- 日時表示は formatDateTimeFull() を使用すること

### 一覧テーブル

カラム: 名称 / ステータスバッジ / 作成日時 / 最終使用日時 / 有効期限 / 操作（編集・失効）

### 新規発行モーダル

- フィールド: 名称（必須）/ 有効期限（任意・datepicker）
- 発行完了後に生のAPIキーを表示するダイアログ（再表示不可の警告付き）
- コピーボタン付き

### 失効操作

- 確認モーダル付き
- DELETE /api-keys/:id → is_active=0 に更新

【厳守】以下のファイルをZIPにまとめず、1ファイルずつ順番に作成してください。
- frontend/src/pages/ApiKeyPage.tsx
```

---

## Phase 5 — 統合・品質

### P5-1 💻 共通UIコンポーネントを生成する ★v1.13更新

```
プロジェクト全体で使用する共通コンポーネントを作成してください。

## カラーパレット（tailwind.config.ts に追加）

primary: { DEFAULT: '#4FB3A5', dark: '#3A9589', light: '#E8F5F3' }
accent:  { DEFAULT: '#6FA8DC', dark: '#378ADD', light: '#EBF3FB' }

## 作成するコンポーネント

frontend/src/constants/
- condition.ts        — CONDITION_OPTIONS 定数・conditionLabel() 関数

frontend/src/hooks/
- useLabels.ts        — ロールラベル + 研究利用ラベルをenv変数から読み込むフック ★v1.14

frontend/src/utils/
- date.ts             — SQLiteのUTC文字列をJSTに変換するユーティリティ ★v1.15

frontend/src/components/ui/
- Badge.tsx
- StatusBadge.tsx
- RoleBadge.tsx       — useLabels() を使用すること
- Avatar.tsx
- LoadingSpinner.tsx
- TypingIndicator.tsx
- ConfirmModal.tsx
- PageHeader.tsx
- CopyButton.tsx

frontend/src/components/layout/
- MobileLayout.tsx    — ヘッダー + ボトムナビ（showBack prop あり）
- DesktopLayout.tsx   — サイドバー + メインエリア
  ★v1.13: サイドバーに「メンバー管理」「システム設定」を追加すること
- AuthLayout.tsx

【厳守】以下のファイルをZIPにまとめず、1ファイルずつ順番に作成してください。
```

---

### P5-2 💻 セットアップ・動作確認手順書を生成する ★v1.15更新

```
docs/DEPLOYMENT.md を作成してください。（★v1.15: DEVELOPMENT.md から改名）

以下の内容を含めること:

1. 前提条件（Node.js 24 LTS / npm 10以上）

2. セットアップ手順
   - リポジトリのクローン
   - ルートの .env 作成（.env.example からコピー）★v1.14
   - npm install（backend / frontend）
   - npm run migrate（backend）
   - シードデータ投入（任意）← セットアップ手順内に含めること ★v1.15

3. 起動方法
   - 一括起動スクリプト（start.ps1 / start.sh）★v1.13
   - 手動起動（ターミナル1: backend / ターミナル2: frontend）
   - アクセス先: http://localhost:3000 / http://localhost:8080/api-docs

4. 各ロールでのログイン確認

5. ラベルカスタマイズの確認手順
   - VITE_LABEL_RESEARCH を含めること ★v1.14

6. 主要APIの curl コマンド例

7. 外部連携APIの確認手順

8. Swagger UIの確認

9. トラブルシューティング
   - 時刻がUTCで表示される場合の対処（TZ=Asia/Tokyo の確認）★v1.15
```

---

### P5-3 🌐📎 実装レビュー依頼プロンプト ★v1.15更新

```
添付のSDD v1.15 と実装済みコードを照合して、以下の観点でレビューしてください。

## レビュー観点

1. API一覧の網羅性
   — 全エンドポイントが実装されているか
   — /system-settings（GET / PUT）が実装されているか ★v1.13
   — /ai/providers（/ai-providers ではない）で登録されているか ★v1.13

2. アクセス制御の正確性
   — doctor/nurse のアクセス範囲が user_organizations で制御されているか
   — consent_agreed=0 の患者データが内部API・外部API両方で拒否されているか

3. APIキー認証の実装
   — SHA-256ハッシュのみDBに保存されているか（生キー保存禁止）
   — is_active=1 かつ expires_at チェックが実装されているか

4. SSEストリーミングの実装
   — text/event-stream で返しているか
   — ストリーム完了後に ai_messages テーブルに全文保存されているか

5. SQLite固有の実装
   — PRAGMA foreign_keys = ON / journal_mode = WAL が設定されているか
   — ENUM・BOOLEAN が正しく代替されているか

6. 環境変数の統合（★v1.14）
   — dotenv が path.resolve(process.cwd(), '../.env') でルートの .env を読み込んでいるか
   — DATABASE_PATH が path.resolve(process.cwd(), '..', DATABASE_PATH) で解決されているか
   — vite.config.ts に envDir: '..' が設定されているか
   — Labels が VITE_LABEL_* を参照しているか（LABEL_* ではない）

7. タイムゾーン対応（★v1.15）
   — .env に TZ=Asia/Tokyo が設定されているか
   — frontend/src/utils/date.ts が実装されているか
   — 全画面で日時表示に date.ts の関数を使用しているか
   — new Date(str).toLocaleString() を直接使用している箇所がないか

8. profiles.position（★v1.13）
   — profiles.age が廃止されて position（TEXT）に変更されているか
   — users.ts / auth.ts / patients.ts で p.position を SELECT しているか
   — seed.ts で position を使用しているか（age は使用していないか）

9. system_settings（★v1.13）
   — system_settings テーブルが schema.sql に定義されているか
   — ai.ts でシステムプロンプトをDBから動的に取得しているか（ハードコードしていないか）
   — SystemSettingsPage から PUT /system-settings/system_prompt で保存できるか

10. メンバー管理・システム設定画面（★v1.13）
    — /admin/members（AdminMembersPage）が実装されているか
    — /admin/system-settings（SystemSettingsPage）が実装されているか
    — DesktopLayout のサイドバーに両画面のリンクが含まれているか

11. 相談トピック初期値（★v1.14）
    — seed.ts のトピックが「体調 / 生活 / 学業 / その他」になっているか（薬機法配慮）

12. 同意画面の文言（★v1.14）
    — VITE_LABEL_DOCTOR / VITE_LABEL_NURSE / VITE_LABEL_RESEARCH が同意文言に反映されているか

不足・問題点を箇条書きでリストアップしてください。
```

---

## 使用順序ガイド

```
P0-1  → SDDを読み込む（必ず最初に実行）

P1-1  → プロジェクト構造生成
P1-2  → 環境変数ファイル生成（ルート .env.example）★v1.14
P1-3  → ラベル設定・date.ts ユーティリティ生成 ★v1.14・v1.15

P2-1  → DBスキーマ（system_settings 含む）★v1.13
P2-2  → DBクライアント・マイグレーション・シード

P3-1  → 認証API
P3-2  → ユーザー管理・担当割当API
P3-3  → 組織管理API
P3-4  → 体調ログAPI
P3-5  → AI相談API（DBからプロンプト取得）★v1.13
P3-6  → APIキー管理・外部連携API
P3-7  → システム設定API・Expressエントリポイント ★v1.13

P4-1  → フロントエンド基盤（vite.config.ts の envDir 設定含む）★v1.14
P4-2  → ログイン・新規登録画面
P4-3  → 同意・撤回画面（VITE_LABEL_RESEARCH 対応）★v1.14
P4-4  → 患者向け画面（date.ts 使用）★v1.15
P4-5  → AI相談画面（date.ts 使用）★v1.15
P4-6  → 医療者向け画面（position / organization_name 表示）★v1.13・v1.15
P4-7  → 管理者向け画面（メンバー管理・システム設定追加）★v1.13
P4-8  → APIキー管理画面（date.ts 使用）★v1.15

P5-1  → 共通UIコンポーネント（P4-1 と並行可）
P5-2  → セットアップ・動作確認手順書（DEPLOYMENT.md）★v1.15
P5-3  → 実装レビュー（バックエンド完成後）
```

---

## ヒント

### Claude.ai で使う場合

- 各プロンプトの冒頭に「添付のSDD」とある場合は SDD_patient_portal_phase1_v1_15.md をファイル添付してから送信する
- 1プロンプトで生成できるコード量の上限を超える場合は「続けてください」で継続する

### Claude Code で使う場合

- プロジェクトルートで `claude` を起動し、P0-1 でSDDを読ませる
- `CLAUDE.md` にSDD全文を貼り付けるとコンテキストが維持されやすい

### 共通

- **【厳守】ファイルは1つずつ出力する:** ZIPやアーカイブにまとめることは禁止
- エラーが出た場合: エラーメッセージをそのまま貼り付けて「修正してください」
- 仕様変更が生じた場合: P5-3 のレビュープロンプトを使って差分を確認する

### v1.13〜v1.15 固有の注意点

- **ルートの .env を参照する:** `dotenv.config({ path: path.resolve(process.cwd(), '../.env') })`
- **DATABASE_PATH の解決:** `path.resolve(process.cwd(), '..', process.env.DATABASE_PATH)` を使用すること
- **vite.config.ts の envDir:** `path.resolve(__dirname, '..')` を設定すること
- **VITE_LABEL_* に統一:** backend の Labels も `process.env.VITE_LABEL_*` を参照すること
- **日時表示は date.ts 経由:** `new Date(str).toLocaleString()` を直接使用しないこと
- **position を使用:** profiles.age は廃止。position（TEXT）を使用すること
- **システムプロンプトはDBから取得:** ai.ts でハードコードしないこと
- **AIプロバイダのルート:** `/ai/providers`（`/ai-providers` ではない）
- **Swagger JSDoc の複数行形式:** preferred_communication は複数行で記述すること（インライン形式はYAMLエラー）
