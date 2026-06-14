# HealthLink — セットアップ・動作確認手順書

**対象バージョン:** SDD v1.15
**最終更新:** 2026-06-13

---

## 1. 前提条件

| ツール | 必要バージョン |
|--------|--------------|
| Node.js | 24 LTS 以上 |
| npm | 10 以上 |

バージョン確認:

```bash
node -v   # v24.x.x
npm -v    # 10.x.x
```

Docker は不要です。Node.js + npm のみで動作します。

---

## 2. セットアップ手順

### 2-1. リポジトリのクローン

```bash
git clone https://github.com/kolinz/healthlink.git
cd healthlink
```

### 2-2. 環境変数ファイルの作成

```bash
cp .env.example .env
```

> **v1.14以降:** 環境変数はルートディレクトリの `.env` に統合されました。`backend/.env` と `frontend/.env` は不要です。

編集必須項目:

| 変数 | 説明 |
|-----|------|
| `JWT_ACCESS_SECRET` | 32文字以上の任意の文字列に変更 |
| `JWT_REFRESH_SECRET` | 32文字以上の任意の文字列に変更 |

### 2-3. 依存パッケージのインストール

```bash
# backend
cd backend && npm install

# frontend
cd ../frontend && npm install
```

### 2-4. データベースのマイグレーション

```bash
cd backend
npm run migrate
```

初回のみ実行します。`backend/data/healthlink.db` が作成されます。

> DBを初期化し直す場合:
> ```bash
> npm run migrate:fresh
> ```

### 2-5. シードデータの投入（任意）

開発・デモ環境でサンプルデータを使用する場合のみ実行します。

```bash
# ルートの .env を編集
LOAD_SEED_DATA=true
```

```bash
cd backend
npm run seed
```

シード完了後、以下のデータが投入されていることを確認してください:

- `users`: admin / suzuki(doctor) / tamura(nurse) / yamada(patient) の4件
- `organizations`: サンプル病院（HOSP001）
- `daily_logs`: yamada の過去7日分
- `consultation_topics`: 体調 / 生活 / 学業 / その他 の4件
- `ai_providers`: Ollama（active=1）
- `system_settings`: AIシステムプロンプト 1件

> **本番環境では必ず `LOAD_SEED_DATA=false`（デフォルト）のまま使用してください。**

シード完了後、`.env` の `LOAD_SEED_DATA` を `false` に戻してください。

---

## 3. 起動方法

### 一括起動スクリプト（推奨）

**Windows:**
```powershell
.\start.ps1   # 起動
.\stop.ps1    # 停止
```

**Linux / Mac:**
```bash
./start.sh    # 起動
./stop.sh     # 停止
```

### 手動起動

**ターミナル 1（バックエンド）:**

```bash
cd backend
npm run dev
# → http://localhost:8080 で起動
```

**ターミナル 2（フロントエンド）:**

```bash
cd frontend
npm run dev
# → http://localhost:3000 で起動
```

### アクセス先

| URL | 説明 |
|-----|------|
| http://localhost:3000 | アプリケーション |
| http://localhost:8080/api-docs | Swagger UI（API仕様書） |
| http://localhost:8080/api-docs.json | OpenAPI JSON |

---

## 4. 各ロールでのログイン確認

| ユーザー名 | パスワード | ロール | 初期遷移先 |
|-----------|-----------|--------|----------|
| admin | Admin1234! | admin | /admin/users |
| suzuki | Doctor1234! | doctor | /dashboard |
| tamura | Nurse1234! | nurse | /dashboard |
| yamada | Patient1234! | patient | /（ホーム） |

> yamada は `consent_agreed=1` のため同意画面はスキップされます。
> admin が作成したユーザーは初回ログイン時に `/consent` へリダイレクトされます。

---

## 5. ラベルカスタマイズの確認手順

HealthLink はロールの表示名・研究利用ラベルを環境変数で変更できます。

### 5-1. ラベルの変更

```bash
# ルートの .env を編集
VITE_LABEL_PATIENT=学生
VITE_LABEL_DOCTOR=相談員
VITE_LABEL_NURSE=保健スタッフ
VITE_LABEL_RESEARCH=学術研究
```

バックエンドとフロントエンドを再起動してください。

### 5-2. 確認箇所

- ダッシュボード: 「患者一覧」→「学生一覧」に変わること
- ユーザー管理画面: ロールフィルタのラベルが変わること
- ロールバッジ: 「患者」→「学生」に変わること
- 同意画面: 「医師・看護師」→「相談員・保健スタッフ」に変わること
- 同意画面: 「医療研究」→「学術研究」に変わること

### 5-3. デフォルトに戻す

```bash
VITE_LABEL_PATIENT=患者
VITE_LABEL_DOCTOR=医師
VITE_LABEL_NURSE=看護師
VITE_LABEL_RESEARCH=医療研究
```

### 施設種別ごとの設定例

| 施設種別 | VITE_LABEL_PATIENT | VITE_LABEL_DOCTOR | VITE_LABEL_NURSE | VITE_LABEL_RESEARCH |
|---------|-------------------|-------------------|------------------|---------------------|
| 病院（デフォルト） | 患者 | 医師 | 看護師 | 医療研究 |
| 大学健康相談室 | 学生 | 相談員 | 保健スタッフ | 学術研究 |
| 企業健康管理室 | 社員 | 産業医 | 保健師 | 健康管理研究 |
| 訪問看護ステーション | 利用者 | 担当医 | 看護師 | 医療研究 |

---

## 6. 主要APIの curl コマンド例

### 6-1. ログイン（JWTトークン取得）

```bash
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"yamada","password":"Patient1234!"}'
```

以降の curl では `ACCESS_TOKEN` に取得したトークンをセットします:

```bash
ACCESS_TOKEN="eyJ..."
```

### 6-2. 体調ログ作成

```bash
curl -X POST http://localhost:8080/daily-logs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "fever_score": 3,
    "steps_yesterday": "4000_6000",
    "condition": 4,
    "appetite_score": 7,
    "sleep_quality": 6,
    "attention_score": 5,
    "note": "少し疲れ気味です"
  }'
```

### 6-3. AI相談セッション開始

```bash
curl -X POST http://localhost:8080/ai/consultations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{"topic_id": null}'
```

### 6-4. SSEメッセージ送信

```bash
CONSULTATION_ID="..."

curl -X POST http://localhost:8080/ai/consultations/$CONSULTATION_ID/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{"content": "最近、頭痛が続いています。"}' \
  --no-buffer
```

> SSEストリーミングのため `--no-buffer` オプションを付与してください。

### 6-5. 自分のログ一覧取得

```bash
curl http://localhost:8080/daily-logs \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### 6-6. トークンのリフレッシュ

```bash
curl -X POST http://localhost:8080/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "eyJ..."}'
```

---

## 7. 外部連携APIの確認手順

### 7-1. APIキーの発行

1. ブラウザで http://localhost:3000 にアクセス
2. `admin` / `Admin1234!` でログイン
3. サイドバー「APIキー管理」→「＋ 新規発行」
4. 名称を入力（例: テスト連携用）して「発行する」をクリック
5. 表示された生のキーをコピー（**このダイアログを閉じると再表示不可**）

または curl で発行:

```bash
ADMIN_TOKEN=$(curl -s -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin1234!"}' \
  | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

curl -X POST http://localhost:8080/api-keys \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"name": "テスト連携用"}'
```

### 7-2. 外部連携APIの疎通確認

```bash
API_KEY="発行されたキーをここに貼り付け"

# 患者一覧
curl "http://localhost:8080/external/patients?page=1&limit=10" \
  -H "X-API-Key: $API_KEY"

# 体調ログ一覧
curl "http://localhost:8080/external/daily-logs?patient_id=<UUID>&from=2026-01-01&to=2026-12-31" \
  -H "X-API-Key: $API_KEY"

# AI相談セッション一覧
curl "http://localhost:8080/external/consultations?page=1&limit=20" \
  -H "X-API-Key: $API_KEY"

# AI相談詳細（メッセージ含む）
curl "http://localhost:8080/external/consultations/<CONSULTATION_ID>" \
  -H "X-API-Key: $API_KEY"
```

> `consent_agreed=0` の患者データは外部連携APIからも返されません。

---

## 8. Swagger UIの確認

http://localhost:8080/api-docs をブラウザで開きます。

**JWT認証:**
1. 「Authorize 🔒」→ `bearerAuth` の Value 欄にアクセストークンを入力
2. 「Authorize」→「Close」

**APIキー認証:**
1. 「Authorize 🔒」→ `apiKeyAuth` の Value 欄に生のAPIキーを入力
2. 「Authorize」→「Close」

---

## 9. トラブルシューティング

### DBが見つからないエラー

```
Error: SQLITE_CANTOPEN: unable to open database file
```

→ `npm run migrate` を実行してDBを作成してください。

### ポートが既に使用中

```
Error: listen EADDRINUSE :::8080
```

**Windows:**
```powershell
.\stop.ps1
```

**Linux / Mac:**
```bash
./stop.sh
```

### better-sqlite3 のビルドエラー

Node.js 24 対応の `better-sqlite3 v12.8.0` 以上が必要です:

```bash
cd backend
grep better-sqlite3 package.json
# "better-sqlite3": "^12.8.0" となっていること
npm rebuild better-sqlite3
```

### Vite の環境変数が反映されない

ルートの `.env` を変更後、フロントエンドを再起動してください。`VITE_` プレフィックスが必須です。

### 時刻がUTCで表示される

ルートの `.env` に以下が設定されているか確認してください:

```
TZ=Asia/Tokyo
```

---

## 10. ディレクトリ構成（参考）

```
healthlink/
├── .env                     # 統合環境変数（.gitignore対象）
├── .env.example             # 環境変数サンプル
├── start.ps1 / stop.ps1     # Windows 起動・停止スクリプト
├── start.sh / stop.sh       # Linux/Mac 起動・停止スクリプト
├── docs/
│   ├── DEPLOYMENT.md        # 本手順書
│   └── SDD_patient_portal_phase1_v1_15.md
├── backend/
│   ├── data/                # SQLiteファイル（.gitignore対象）
│   ├── src/
│   │   ├── config/          # labels.ts / swagger/
│   │   ├── db/              # client / migrate / seed / schema.sql
│   │   ├── middleware/      # auth / consent / role / apiKey
│   │   ├── routes/          # 各APIルート
│   │   ├── services/        # aiProviders / orgAccess
│   │   └── types/           # 型定義
│   └── package.json
└── frontend/
    ├── src/
    │   ├── api/             # APIクライアント関数
    │   ├── components/      # ui / layout コンポーネント
    │   ├── constants/       # condition.ts
    │   ├── hooks/           # useLabels.ts
    │   ├── pages/           # 各画面コンポーネント
    │   ├── store/           # Zustand ストア
    │   ├── utils/           # date.ts（タイムゾーン変換）
    │   └── types/           # 型定義
    └── package.json
```
