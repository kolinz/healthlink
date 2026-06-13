import path from 'path';
import dotenv from 'dotenv';

// ルートディレクトリの .env を読み込む
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

if (process.env.LOAD_SEED_DATA !== 'true') {
  console.log('LOAD_SEED_DATA が true でないためシードをスキップします');
  process.exit(0);
}

import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from './client';

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS ?? '10', 10);

console.log('[seed] シードデータの投入を開始します');

// ============================================================
// users
// ============================================================
const userIds = {
  admin:  uuidv4(),
  suzuki: uuidv4(),
  tamura: uuidv4(),
  yamada: uuidv4(),
};

const insertUser = db.prepare(`
  INSERT INTO users (id, username, password_hash, role, is_active, consent_agreed, consent_agreed_at, consent_version, created_at)
  VALUES (@id, @username, @password_hash, @role, @is_active, @consent_agreed, @consent_agreed_at, @consent_version, @created_at)
`);

const now = new Date().toISOString();

insertUser.run({ id: userIds.admin,  username: 'admin',  password_hash: bcrypt.hashSync('Admin1234!',   BCRYPT_ROUNDS), role: 'admin',   is_active: 1, consent_agreed: 0, consent_agreed_at: null, consent_version: null, created_at: now });
insertUser.run({ id: userIds.suzuki, username: 'suzuki', password_hash: bcrypt.hashSync('Doctor1234!',  BCRYPT_ROUNDS), role: 'doctor',  is_active: 1, consent_agreed: 0, consent_agreed_at: null, consent_version: null, created_at: now });
insertUser.run({ id: userIds.tamura, username: 'tamura', password_hash: bcrypt.hashSync('Nurse1234!',   BCRYPT_ROUNDS), role: 'nurse',   is_active: 1, consent_agreed: 0, consent_agreed_at: null, consent_version: null, created_at: now });
insertUser.run({ id: userIds.yamada, username: 'yamada', password_hash: bcrypt.hashSync('Patient1234!', BCRYPT_ROUNDS), role: 'patient', is_active: 1, consent_agreed: 1, consent_agreed_at: now,  consent_version: '1.0', created_at: now });

console.log('[seed] users: 4件投入完了');

// ============================================================
// profiles
// ============================================================
const insertProfile = db.prepare(`
  INSERT INTO profiles (id, user_id, name, email, position, created_at)
  VALUES (@id, @user_id, @name, @email, @position, @created_at)
`);

insertProfile.run({ id: uuidv4(), user_id: userIds.suzuki, name: '鈴木 太郎', email: 'suzuki@example.com', position: '内科医',   created_at: now });
insertProfile.run({ id: uuidv4(), user_id: userIds.tamura, name: '田村 美咲', email: 'tamura@example.com', position: '看護師長', created_at: now });
insertProfile.run({ id: uuidv4(), user_id: userIds.yamada, name: '山田 花子', email: 'yamada@example.com', position: null,       created_at: now });

console.log('[seed] profiles: 3件投入完了');

// ============================================================
// organizations
// ============================================================
const orgId = uuidv4();
db.prepare(`
  INSERT INTO organizations (id, name, code, is_active, created_at)
  VALUES (@id, @name, @code, @is_active, @created_at)
`).run({ id: orgId, name: 'サンプル病院', code: 'HOSP001', is_active: 1, created_at: now });

console.log('[seed] organizations: 1件投入完了');

// ============================================================
// user_organizations
// ============================================================
const insertUserOrg = db.prepare(`
  INSERT INTO user_organizations (id, user_id, organization_id, assigned_at)
  VALUES (@id, @user_id, @organization_id, @assigned_at)
`);
insertUserOrg.run({ id: uuidv4(), user_id: userIds.suzuki, organization_id: orgId, assigned_at: now });
insertUserOrg.run({ id: uuidv4(), user_id: userIds.tamura, organization_id: orgId, assigned_at: now });
insertUserOrg.run({ id: uuidv4(), user_id: userIds.yamada, organization_id: orgId, assigned_at: now });

console.log('[seed] user_organizations: 3件投入完了');

// ============================================================
// assignments
// ============================================================
const insertAssignment = db.prepare(`
  INSERT INTO assignments (id, patient_id, provider_id, assigned_at)
  VALUES (@id, @patient_id, @provider_id, @assigned_at)
`);
insertAssignment.run({ id: uuidv4(), patient_id: userIds.yamada, provider_id: userIds.suzuki, assigned_at: now });
insertAssignment.run({ id: uuidv4(), patient_id: userIds.yamada, provider_id: userIds.tamura, assigned_at: now });

console.log('[seed] assignments: 2件投入完了');

// ============================================================
// daily_logs（yamada の過去7日分）
// ============================================================
const insertLog = db.prepare(`
  INSERT INTO daily_logs (
    id, patient_id, logged_at,
    fever_score, steps_yesterday, condition,
    appetite_score, sleep_quality, attention_score,
    note, status
  ) VALUES (
    @id, @patient_id, @logged_at,
    @fever_score, @steps_yesterday, @condition,
    @appetite_score, @sleep_quality, @attention_score,
    @note, @status
  )
`);

const seedLogs = [
  { daysAgo: 6, fever_score: 3, steps: '2000_4000', condition: 4, appetite_score: 5, sleep_quality: 6, attention_score: 7 },
  { daysAgo: 5, fever_score: 2, steps: '4000_6000', condition: 5, appetite_score: 7, sleep_quality: 7, attention_score: 4 },
  { daysAgo: 4, fever_score: 4, steps: '2000_4000', condition: 3, appetite_score: 4, sleep_quality: 5, attention_score: 8 },
  { daysAgo: 3, fever_score: 3, steps: '4000_6000', condition: 5, appetite_score: 8, sleep_quality: 6, attention_score: 3 },
  { daysAgo: 2, fever_score: 5, steps: '2000_4000', condition: 4, appetite_score: 6, sleep_quality: 4, attention_score: 5 },
  { daysAgo: 1, fever_score: 2, steps: '4000_6000', condition: 5, appetite_score: 9, sleep_quality: 8, attention_score: 2 },
  { daysAgo: 0, fever_score: 3, steps: '2000_4000', condition: 4, appetite_score: 7, sleep_quality: 7, attention_score: 6 },
];

for (const log of seedLogs) {
  const loggedAt = new Date();
  loggedAt.setDate(loggedAt.getDate() - log.daysAgo);
  loggedAt.setHours(9, 0, 0, 0);
  insertLog.run({
    id: uuidv4(), patient_id: userIds.yamada, logged_at: loggedAt.toISOString(),
    fever_score: log.fever_score, steps_yesterday: log.steps, condition: log.condition,
    appetite_score: log.appetite_score, sleep_quality: log.sleep_quality,
    attention_score: log.attention_score, note: null, status: 'unchecked',
  });
}

console.log('[seed] daily_logs: 7件投入完了');

// ============================================================
// consultation_topics
// ============================================================
const insertTopic = db.prepare(`
  INSERT INTO consultation_topics (id, label, icon, sort_order, is_active, created_at)
  VALUES (@id, @label, @icon, @sort_order, @is_active, @created_at)
`);
insertTopic.run({ id: uuidv4(), label: '体調', icon: 'ti-thermometer', sort_order: 1, is_active: 1, created_at: now });
insertTopic.run({ id: uuidv4(), label: '生活', icon: 'ti-heart',       sort_order: 2, is_active: 1, created_at: now });
insertTopic.run({ id: uuidv4(), label: '学業', icon: 'ti-book',        sort_order: 3, is_active: 1, created_at: now });
insertTopic.run({ id: uuidv4(), label: 'その他',     icon: 'ti-dots',        sort_order: 4, is_active: 1, created_at: now });

console.log('[seed] consultation_topics: 4件投入完了');

// ============================================================
// ai_providers
// ============================================================
db.prepare(`
  INSERT INTO ai_providers (id, name, provider_type, endpoint, api_key, model, active, created_at)
  VALUES (@id, @name, @provider_type, @endpoint, @api_key, @model, @active, @created_at)
`).run({ id: uuidv4(), name: 'Ollama', provider_type: 'ollama', endpoint: 'http://localhost:11434', api_key: null, model: 'llama3', active: 1, created_at: now });

console.log('[seed] ai_providers: 1件投入完了');

// ============================================================
// system_settings（初期システムプロンプト）
// ============================================================
db.prepare(`
  INSERT OR REPLACE INTO system_settings (key, value, updated_at)
  VALUES ('system_prompt', ?, DATETIME('now'))
`).run(
  'あなたは相談者の健康状態をサポートするAIアシスタントです。\n医師の診断や処方の代替は禁止です。症状が重い場合は必ず医師への相談を促してください。'
);

console.log('[seed] system_settings: 1件投入完了');
console.log('[seed] シードデータの投入が完了しました');
