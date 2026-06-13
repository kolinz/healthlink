-- HealthLink SQLite スキーマ
-- SDD v1.12 セクション5 に基づく（position拡張・system_settings追加）
-- 注意: 接続時に PRAGMA foreign_keys = ON を実行すること

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

CREATE TABLE IF NOT EXISTS profiles (
  id                      TEXT PRIMARY KEY,
  user_id                 TEXT NOT NULL REFERENCES users(id),
  name                    TEXT,
  email                   TEXT,
  position                TEXT,
  preferred_communication TEXT CHECK(preferred_communication IN ('email','chat','in_person')),
  updated_at              TEXT,
  created_at              TEXT NOT NULL DEFAULT (DATETIME('now'))
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id),
  token_hash  TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  revoked     INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (DATETIME('now'))
);

CREATE TABLE IF NOT EXISTS organizations (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  code       TEXT UNIQUE,
  is_active  INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (DATETIME('now'))
);

CREATE TABLE IF NOT EXISTS user_organizations (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  assigned_at     TEXT NOT NULL DEFAULT (DATETIME('now')),
  UNIQUE(user_id, organization_id)
);

CREATE TABLE IF NOT EXISTS assignments (
  id          TEXT PRIMARY KEY,
  patient_id  TEXT NOT NULL REFERENCES users(id),
  provider_id TEXT NOT NULL REFERENCES users(id),
  assigned_at TEXT NOT NULL DEFAULT (DATETIME('now')),
  UNIQUE(patient_id, provider_id)
);

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

CREATE TABLE IF NOT EXISTS medical_notes (
  id           TEXT PRIMARY KEY,
  daily_log_id TEXT NOT NULL REFERENCES daily_logs(id),
  provider_id  TEXT NOT NULL REFERENCES users(id),
  note         TEXT NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (DATETIME('now')),
  updated_at   TEXT
);

CREATE TABLE IF NOT EXISTS consultation_topics (
  id         TEXT PRIMARY KEY,
  label      TEXT NOT NULL,
  icon       TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active  INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (DATETIME('now'))
);

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

CREATE TABLE IF NOT EXISTS ai_messages (
  id              TEXT PRIMARY KEY,
  consultation_id TEXT NOT NULL REFERENCES ai_consultations(id),
  role            TEXT NOT NULL CHECK(role IN ('user','assistant')),
  content         TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (DATETIME('now'))
);

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

-- ============================================================
-- system_settings（システム設定・汎用 key/value）
-- ============================================================
CREATE TABLE IF NOT EXISTS system_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (DATETIME('now'))
);

-- ============================================================
-- インデックス
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_user_orgs_user ON user_organizations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_orgs_org ON user_organizations(organization_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_patient ON daily_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_logged_at ON daily_logs(logged_at);
CREATE INDEX IF NOT EXISTS idx_ai_consultations_patient ON ai_consultations(patient_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_consultation ON ai_messages(consultation_id);
CREATE INDEX IF NOT EXISTS idx_assignments_patient ON assignments(patient_id);
CREATE INDEX IF NOT EXISTS idx_assignments_provider ON assignments(provider_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
