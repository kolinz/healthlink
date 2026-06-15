# HealthLink — セットアップ・動作確認手順書

**対象バージョン:** SDD v1.15
**最終更新:** 2026-06-13
**動作確認環境:** Ubuntu 24 / Windows 11

---

## 1. 前提条件

| ツール | 必要バージョン |
|--------|--------------|
| Node.js | 24 LTS 以上 |
| npm | 10 以上 |
| git | 2.x 以上 |

バージョン確認:

```bash
node -v   # v24.x.x
npm -v    # 10.x.x
git --version
```

Docker は不要です。Node.js + npm のみで動作します。

---

## 2. セットアップ手順（Linux / Linux(WSL) / Mac）

### 2-1. リポジトリのクローン

```bash
git clone https://github.com/kolinz/healthlink.git
cd healthlink
```

### 2-2. 環境変数ファイルの作成

```bash
cp .env.example .env
```

`.env` を開いて以下の項目を必ず変更してください：

| 変数 | 説明 |
|-----|------|
| `JWT_ACCESS_SECRET` | 32文字以上の任意の文字列 |
| `JWT_REFRESH_SECRET` | 32文字以上の任意の文字列 |
| `CORS_ORIGIN` | フロントエンドのURL（例: `http://xxx.xxx.xxx.xxx:3000` または `http://yourdomain.com:3000`） |
| `VITE_API_URL` | バックエンドのURL（例: `http://xxx.xxx.xxx.xxx:8080` または `http://yourdomain.com:8080`） |

> **ローカル開発環境の場合:** `CORS_ORIGIN=http://localhost:3000` / `VITE_API_URL=http://localhost:8080` のままで構いません。
>
> **外部公開する場合:** サーバーのIPアドレスまたはドメイン名に変更してください。また、ファイアウォールでポート **3000**（フロントエンド）と **8080**（バックエンドAPI）を開放してください。

> **外部公開時の追加設定:** `frontend/vite.config.ts` の `server` に `host: '0.0.0.0'` と `allowedHosts` が必要です。デフォルトでは `localhost` のみリッスンするため、外部からアクセスできません。
>
> ```typescript
> server: {
>   port: 3000,
>   host: '0.0.0.0',
>   allowedHosts: ['.example.com'],  // ← 使用するドメインに変更（例: ['.abc.online']）
> }
> ```
>
> `allowedHosts` を設定しないと、ドメイン経由でアクセスした際に `Blocked request` エラーが発生します。IPアドレス直打ちの場合は不要です。

```bash
nano .env
```

### 2-3. 実行権限の付与

```bash
chmod +x setupdb.sh start.sh stop.sh
```

### 2-4. 初回セットアップ（npm install + migrate + seed）

```bash
./setupdb.sh
```

以下を一括実行します：
1. バックエンドの `npm install`
2. フロントエンドの `npm install`
3. DBマイグレーション（`backend/data/healthlink.db` を作成）
4. シードデータ投入（完了後に `LOAD_SEED_DATA=false` に自動復元）

### 2-5. 起動

```bash
./start.sh
```

### 2-6. 停止

```bash
./stop.sh
```

---

## 3. 起動後の初期設定

### 3-1. 管理者でログイン

http://localhost:3000 にアクセスし、以下でログインします：

| ユーザー名 | パスワード |
|-----------|-----------|
| admin | Admin1234! |

### 3-2. AI接続設定

1. サイドバー「AI接続設定」をクリック
2. 「＋ プロバイダ追加」をクリック
3. 以下を入力：

| 項目 | 値 |
|-----|---|
| 名称 | 任意（例: GPT-5-nano） |
| プロバイダタイプ | OpenAI |
| エンドポイント | `https://api.openai.com/v1` |
| APIキー | OpenAIのAPIキー |
| モデル | gpt-5-nano（デフォルト）|

4. 「追加」→「有効化」をクリック

> **注意:** エンドポイントは `https://api.openai.com/v1` のみ入力してください。`/chat/completions` は自動で付加されます。

### 3-3. システムプロンプトの確認・編集（任意）

1. サイドバー「システム設定」をクリック
2. AIシステムプロンプトを施設の方針に合わせて編集
3. 「保存する」をクリック

---

## 4. アクセス先

| URL | 説明 |
|-----|------|
| http://localhost:3000 | アプリケーション（ローカル） |
| http://localhost:8080/api-docs | Swagger UI（ローカル） |
| http://<サーバーIP or ドメイン>:3000 | アプリケーション（外部公開時） |
| http://<サーバーIP or ドメイン>:8080/api-docs | Swagger UI（外部公開時） |

---

## 5. 各ロールでのログイン確認

| ユーザー名 | パスワード | ロール | 氏名 |
|-----------|-----------|--------|------|
| admin | Admin1234! | admin | — |
| aoyama | Doctor1234! | 医師 | 青山 遥 |
| hayashi | Doctor1234! | 医師 | 林 澪 |
| shimizu | Nurse1234! | 看護師 | 清水 蒼 |
| nishida | Nurse1234! | 看護師 | 西田 凪 |
| sakura01 | User1234! | 学生 | 青木 いずみ |
| kaze02 | User1234! | 学生 | 石川 かなた |
| tsuki03 | User1234! | 学生 | 上田 ひびき |
| hoshi04 | User1234! | 学生 | 江口 なつき |
| yama05 | User1234! | 学生 | 小野 はるか |
| umi06 | User1234! | 学生 | 川田 みなと |
| sora07 | User1234! | 学生 | 木村 りく |
| hana08 | User1234! | 学生 | 坂本 こころ |
| mori09 | User1234! | 学生 | 田中 いつき |
| tani10 | User1234! | 学生 | 中村 みずほ |

> 医師・看護師・学生は初回ログイン時に `/consent` へリダイレクトされます（デモデータ(seedデータ)の学生のみ `consent_agreed=1` のためスキップ）。
> 実運用で新規作成されたユーザーは全員、初回ログイン時に同意画面が表示されます。

---

## 6. ラベルカスタマイズ

HealthLink はロールの表示名・研究利用ラベルを環境変数で変更できます。

```bash
# ルートの .env を編集
VITE_LABEL_PATIENT=学生
VITE_LABEL_DOCTOR=相談員
VITE_LABEL_NURSE=保健スタッフ
VITE_LABEL_RESEARCH=学術研究
```

バックエンドとフロントエンドを再起動してください。

### 施設種別ごとの設定例

| 施設種別 | VITE_LABEL_PATIENT | VITE_LABEL_DOCTOR | VITE_LABEL_NURSE | VITE_LABEL_RESEARCH |
|---------|-------------------|-------------------|------------------|---------------------|
| 病院（デフォルト） | 患者 | 医師 | 看護師 | 医療研究 |
| 大学健康相談室 | 学生 | 相談員 | 保健スタッフ | 学術研究 |
| 企業健康管理室 | 社員 | 産業医 | 保健師 | 健康管理研究 |
| 訪問看護ステーション | 利用者 | 担当医 | 看護師 | 医療研究 |

---

## 7. 主要APIの curl コマンド例

### 7-1. ログイン（JWTトークン取得）

```bash
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"yamada","password":"Patient1234!"}'
```

以降の curl では `ACCESS_TOKEN` に取得したトークンをセットします:

```bash
ACCESS_TOKEN="eyJ..."
```

### 7-2. 体調ログ作成

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

### 7-3. AI相談セッション開始

```bash
curl -X POST http://localhost:8080/ai/consultations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{"topic_id": null}'
```

### 7-4. SSEメッセージ送信

```bash
CONSULTATION_ID="..."

curl -X POST http://localhost:8080/ai/consultations/$CONSULTATION_ID/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{"content": "最近、頭痛が続いています。"}' \
  --no-buffer
```

---

## 8. 外部連携APIの確認手順

### 8-1. APIキーの発行

1. ブラウザで http://localhost:3000 にアクセス
2. `admin` / `Admin1234!` でログイン
3. サイドバー「APIキー管理」→「＋ 新規発行」
4. 名称を入力して「発行する」をクリック
5. 表示された生のキーをコピー（**再表示不可**）

### 8-2. 疎通確認

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
```

> `consent_agreed=0` の患者データは外部連携APIからも返されません。

---

## 9. Swagger UIの確認

http://localhost:8080/api-docs をブラウザで開きます。

**JWT認証:**
1. 「Authorize 🔒」→ `bearerAuth` の Value 欄にアクセストークンを入力
2. 「Authorize」→「Close」

**APIキー認証:**
1. 「Authorize 🔒」→ `apiKeyAuth` の Value 欄に生のAPIキーを入力
2. 「Authorize」→「Close」

---

## 10. トラブルシューティング

### DBが見つからないエラー

```
Error: SQLITE_CANTOPEN: unable to open database file
```

→ `./setupdb.sh` を実行してDBを作成してください。

### DBを初期化し直す場合

```bash
cd backend
npm run migrate:fresh
```

既存の `backend/data/healthlink.db` を削除して再作成します。
実行後、シードデータを再投入する場合は `./setupdb.sh` を再実行してください。

> **注意:** 本番環境では実データが全て削除されます。必ずバックアップを取ってから実行してください。

### ポートが既に使用中

```
Error: listen EADDRINUSE :::8080
```

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


## 11. ディレクトリ構成（参考）

```
healthlink/
├── .env                     # 統合環境変数（.gitignore対象）
├── .env.example             # 環境変数サンプル
├── .gitignore
├── setupdb.sh               # 初回セットアップスクリプト（Linux/Mac）
├── start.sh / stop.sh       # 起動・停止スクリプト（Linux/Mac）
├── start.ps1 / stop.ps1     # 起動・停止スクリプト（Windows）
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
