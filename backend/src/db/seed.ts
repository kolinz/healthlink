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
  admin:     uuidv4(),
  doctor1:   uuidv4(),
  doctor2:   uuidv4(),
  nurse1:    uuidv4(),
  nurse2:    uuidv4(),
  patient1:  uuidv4(),
  patient2:  uuidv4(),
  patient3:  uuidv4(),
  patient4:  uuidv4(),
  patient5:  uuidv4(),
  patient6:  uuidv4(),
  patient7:  uuidv4(),
  patient8:  uuidv4(),
  patient9:  uuidv4(),
  patient10: uuidv4(),
};

const insertUser = db.prepare(`
  INSERT INTO users (id, username, password_hash, role, is_active, consent_agreed, consent_agreed_at, consent_version, created_at)
  VALUES (@id, @username, @password_hash, @role, @is_active, @consent_agreed, @consent_agreed_at, @consent_version, @created_at)
`);

const now = new Date().toISOString();

// admin
insertUser.run({ id: userIds.admin,     username: 'admin',    password_hash: bcrypt.hashSync('Admin1234!',  BCRYPT_ROUNDS), role: 'admin',   is_active: 1, consent_agreed: 0, consent_agreed_at: null, consent_version: null,  created_at: now });
// 医師
insertUser.run({ id: userIds.doctor1,   username: 'aoyama',   password_hash: bcrypt.hashSync('Doctor1234!', BCRYPT_ROUNDS), role: 'doctor',  is_active: 1, consent_agreed: 0, consent_agreed_at: null, consent_version: null,  created_at: now });
insertUser.run({ id: userIds.doctor2,   username: 'hayashi',  password_hash: bcrypt.hashSync('Doctor1234!', BCRYPT_ROUNDS), role: 'doctor',  is_active: 1, consent_agreed: 0, consent_agreed_at: null, consent_version: null,  created_at: now });
// 看護師
insertUser.run({ id: userIds.nurse1,    username: 'shimizu',  password_hash: bcrypt.hashSync('Nurse1234!',  BCRYPT_ROUNDS), role: 'nurse',   is_active: 1, consent_agreed: 0, consent_agreed_at: null, consent_version: null,  created_at: now });
insertUser.run({ id: userIds.nurse2,    username: 'nishida',  password_hash: bcrypt.hashSync('Nurse1234!',  BCRYPT_ROUNDS), role: 'nurse',   is_active: 1, consent_agreed: 0, consent_agreed_at: null, consent_version: null,  created_at: now });
// 学生
insertUser.run({ id: userIds.patient1,  username: 'sakura01', password_hash: bcrypt.hashSync('User1234!',   BCRYPT_ROUNDS), role: 'patient', is_active: 1, consent_agreed: 1, consent_agreed_at: now,  consent_version: '1.0', created_at: now });
insertUser.run({ id: userIds.patient2,  username: 'kaze02',   password_hash: bcrypt.hashSync('User1234!',   BCRYPT_ROUNDS), role: 'patient', is_active: 1, consent_agreed: 1, consent_agreed_at: now,  consent_version: '1.0', created_at: now });
insertUser.run({ id: userIds.patient3,  username: 'tsuki03',  password_hash: bcrypt.hashSync('User1234!',   BCRYPT_ROUNDS), role: 'patient', is_active: 1, consent_agreed: 1, consent_agreed_at: now,  consent_version: '1.0', created_at: now });
insertUser.run({ id: userIds.patient4,  username: 'hoshi04',  password_hash: bcrypt.hashSync('User1234!',   BCRYPT_ROUNDS), role: 'patient', is_active: 1, consent_agreed: 1, consent_agreed_at: now,  consent_version: '1.0', created_at: now });
insertUser.run({ id: userIds.patient5,  username: 'yama05',   password_hash: bcrypt.hashSync('User1234!',   BCRYPT_ROUNDS), role: 'patient', is_active: 1, consent_agreed: 1, consent_agreed_at: now,  consent_version: '1.0', created_at: now });
insertUser.run({ id: userIds.patient6,  username: 'umi06',    password_hash: bcrypt.hashSync('User1234!',   BCRYPT_ROUNDS), role: 'patient', is_active: 1, consent_agreed: 1, consent_agreed_at: now,  consent_version: '1.0', created_at: now });
insertUser.run({ id: userIds.patient7,  username: 'sora07',   password_hash: bcrypt.hashSync('User1234!',   BCRYPT_ROUNDS), role: 'patient', is_active: 1, consent_agreed: 1, consent_agreed_at: now,  consent_version: '1.0', created_at: now });
insertUser.run({ id: userIds.patient8,  username: 'hana08',   password_hash: bcrypt.hashSync('User1234!',   BCRYPT_ROUNDS), role: 'patient', is_active: 1, consent_agreed: 1, consent_agreed_at: now,  consent_version: '1.0', created_at: now });
insertUser.run({ id: userIds.patient9,  username: 'mori09',   password_hash: bcrypt.hashSync('User1234!',   BCRYPT_ROUNDS), role: 'patient', is_active: 1, consent_agreed: 1, consent_agreed_at: now,  consent_version: '1.0', created_at: now });
insertUser.run({ id: userIds.patient10, username: 'tani10',   password_hash: bcrypt.hashSync('User1234!',   BCRYPT_ROUNDS), role: 'patient', is_active: 1, consent_agreed: 1, consent_agreed_at: now,  consent_version: '1.0', created_at: now });

console.log('[seed] users: 15件投入完了');

// ============================================================
// profiles
// ============================================================
const insertProfile = db.prepare(`
  INSERT INTO profiles (id, user_id, name, email, position, created_at)
  VALUES (@id, @user_id, @name, @email, @position, @created_at)
`);

insertProfile.run({ id: uuidv4(), user_id: userIds.doctor1,   name: '青山 遥',   email: 'aoyama@example.com',   position: '内科医',   created_at: now });
insertProfile.run({ id: uuidv4(), user_id: userIds.doctor2,   name: '林 澪',     email: 'hayashi@example.com',  position: '精神科医', created_at: now });
insertProfile.run({ id: uuidv4(), user_id: userIds.nurse1,    name: '清水 蒼',   email: 'shimizu@example.com',  position: '看護師長', created_at: now });
insertProfile.run({ id: uuidv4(), user_id: userIds.nurse2,    name: '西田 凪',   email: 'nishida@example.com',  position: '看護師',   created_at: now });
insertProfile.run({ id: uuidv4(), user_id: userIds.patient1,  name: '青木 いずみ', email: 'sakura01@example.com', position: '1年生',  created_at: now });
insertProfile.run({ id: uuidv4(), user_id: userIds.patient2,  name: '石川 かなた', email: 'kaze02@example.com',   position: '2年生',  created_at: now });
insertProfile.run({ id: uuidv4(), user_id: userIds.patient3,  name: '上田 ひびき', email: 'tsuki03@example.com',  position: '3年生',  created_at: now });
insertProfile.run({ id: uuidv4(), user_id: userIds.patient4,  name: '江口 なつき', email: 'hoshi04@example.com',  position: '4年生',  created_at: now });
insertProfile.run({ id: uuidv4(), user_id: userIds.patient5,  name: '小野 はるか', email: 'yama05@example.com',   position: '1年生',  created_at: now });
insertProfile.run({ id: uuidv4(), user_id: userIds.patient6,  name: '川田 みなと', email: 'umi06@example.com',    position: '2年生',  created_at: now });
insertProfile.run({ id: uuidv4(), user_id: userIds.patient7,  name: '木村 りく',   email: 'sora07@example.com',   position: '3年生',  created_at: now });
insertProfile.run({ id: uuidv4(), user_id: userIds.patient8,  name: '坂本 こころ', email: 'hana08@example.com',   position: '4年生',  created_at: now });
insertProfile.run({ id: uuidv4(), user_id: userIds.patient9,  name: '田中 いつき', email: 'mori09@example.com',   position: '1年生',  created_at: now });
insertProfile.run({ id: uuidv4(), user_id: userIds.patient10, name: '中村 みずほ', email: 'tani10@example.com',   position: '2年生',  created_at: now });

console.log('[seed] profiles: 14件投入完了');

// ============================================================
// organizations
// ============================================================
const orgId = uuidv4();
db.prepare(`
  INSERT INTO organizations (id, name, code, is_active, created_at)
  VALUES (@id, @name, @code, @is_active, @created_at)
`).run({ id: orgId, name: 'サンプル大学 健康相談室', code: 'UNIV001', is_active: 1, created_at: now });

console.log('[seed] organizations: 1件投入完了');

// ============================================================
// user_organizations
// ============================================================
const insertUserOrg = db.prepare(`
  INSERT INTO user_organizations (id, user_id, organization_id, assigned_at)
  VALUES (@id, @user_id, @organization_id, @assigned_at)
`);

for (const userId of [
  userIds.doctor1, userIds.doctor2, userIds.nurse1, userIds.nurse2,
  userIds.patient1, userIds.patient2, userIds.patient3, userIds.patient4, userIds.patient5,
  userIds.patient6, userIds.patient7, userIds.patient8, userIds.patient9, userIds.patient10,
]) {
  insertUserOrg.run({ id: uuidv4(), user_id: userId, organization_id: orgId, assigned_at: now });
}

console.log('[seed] user_organizations: 14件投入完了');

// ============================================================
// assignments
// ============================================================
const insertAssignment = db.prepare(`
  INSERT INTO assignments (id, patient_id, provider_id, assigned_at)
  VALUES (@id, @patient_id, @provider_id, @assigned_at)
`);

for (const patientId of [userIds.patient1, userIds.patient2, userIds.patient3, userIds.patient4, userIds.patient5]) {
  insertAssignment.run({ id: uuidv4(), patient_id: patientId, provider_id: userIds.doctor1, assigned_at: now });
}
for (const patientId of [userIds.patient6, userIds.patient7, userIds.patient8, userIds.patient9, userIds.patient10]) {
  insertAssignment.run({ id: uuidv4(), patient_id: patientId, provider_id: userIds.doctor2, assigned_at: now });
}
for (const patientId of [
  userIds.patient1, userIds.patient2, userIds.patient3, userIds.patient4, userIds.patient5,
  userIds.patient6, userIds.patient7, userIds.patient8, userIds.patient9, userIds.patient10,
]) {
  insertAssignment.run({ id: uuidv4(), patient_id: patientId, provider_id: userIds.nurse1, assigned_at: now });
}

console.log('[seed] assignments: 20件投入完了');

// ============================================================
// daily_logs（各患者の過去7日分）
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

const patientLogPatterns: Record<string, any[]> = {
  [userIds.patient1]: [
    { daysAgo: 6, fever: 2, steps: '4000_6000', cond: 4, appetite: 7, sleep: 7, attention: 3 },
    { daysAgo: 5, fever: 2, steps: '4000_6000', cond: 5, appetite: 8, sleep: 8, attention: 2 },
    { daysAgo: 4, fever: 3, steps: '2000_4000', cond: 4, appetite: 6, sleep: 6, attention: 4 },
    { daysAgo: 3, fever: 2, steps: '4000_6000', cond: 5, appetite: 7, sleep: 7, attention: 3 },
    { daysAgo: 2, fever: 2, steps: '6000_8000', cond: 5, appetite: 8, sleep: 8, attention: 2 },
    { daysAgo: 1, fever: 2, steps: '4000_6000', cond: 4, appetite: 7, sleep: 7, attention: 3 },
    { daysAgo: 0, fever: 2, steps: '4000_6000', cond: 5, appetite: 8, sleep: 8, attention: 2 },
  ],
  [userIds.patient2]: [
    { daysAgo: 6, fever: 4, steps: '2000_4000', cond: 3, appetite: 5, sleep: 5, attention: 6 },
    { daysAgo: 5, fever: 5, steps: 'under_2000', cond: 2, appetite: 4, sleep: 4, attention: 8 },
    { daysAgo: 4, fever: 6, steps: 'under_2000', cond: 2, appetite: 3, sleep: 3, attention: 9 },
    { daysAgo: 3, fever: 5, steps: 'under_2000', cond: 2, appetite: 4, sleep: 4, attention: 8 },
    { daysAgo: 2, fever: 4, steps: '2000_4000', cond: 3, appetite: 5, sleep: 5, attention: 7 },
    { daysAgo: 1, fever: 3, steps: '2000_4000', cond: 3, appetite: 5, sleep: 5, attention: 6 },
    { daysAgo: 0, fever: 3, steps: '2000_4000', cond: 3, appetite: 6, sleep: 6, attention: 6 },
  ],
  [userIds.patient3]: [
    { daysAgo: 6, fever: 3, steps: '4000_6000', cond: 4, appetite: 6, sleep: 6, attention: 5 },
    { daysAgo: 5, fever: 3, steps: '4000_6000', cond: 4, appetite: 6, sleep: 6, attention: 5 },
    { daysAgo: 4, fever: 2, steps: '6000_8000', cond: 5, appetite: 7, sleep: 7, attention: 3 },
    { daysAgo: 3, fever: 2, steps: '6000_8000', cond: 5, appetite: 8, sleep: 8, attention: 2 },
    { daysAgo: 2, fever: 2, steps: '4000_6000', cond: 4, appetite: 7, sleep: 7, attention: 4 },
    { daysAgo: 1, fever: 2, steps: '4000_6000', cond: 5, appetite: 7, sleep: 7, attention: 3 },
    { daysAgo: 0, fever: 2, steps: '4000_6000', cond: 4, appetite: 7, sleep: 7, attention: 4 },
  ],
  [userIds.patient4]: [
    { daysAgo: 6, fever: 7, steps: 'under_2000', cond: 1, appetite: 2, sleep: 2, attention: 10 },
    { daysAgo: 5, fever: 8, steps: 'under_2000', cond: 1, appetite: 2, sleep: 2, attention: 10 },
    { daysAgo: 4, fever: 7, steps: 'under_2000', cond: 1, appetite: 3, sleep: 3, attention: 9 },
    { daysAgo: 3, fever: 6, steps: 'under_2000', cond: 2, appetite: 3, sleep: 3, attention: 9 },
    { daysAgo: 2, fever: 5, steps: 'under_2000', cond: 2, appetite: 4, sleep: 4, attention: 8 },
    { daysAgo: 1, fever: 4, steps: '2000_4000', cond: 2, appetite: 4, sleep: 4, attention: 8 },
    { daysAgo: 0, fever: 4, steps: '2000_4000', cond: 3, appetite: 5, sleep: 5, attention: 7 },
  ],
  [userIds.patient5]: [
    { daysAgo: 6, fever: 2, steps: '6000_8000', cond: 5, appetite: 9, sleep: 8, attention: 2 },
    { daysAgo: 5, fever: 2, steps: 'over_8000',  cond: 5, appetite: 9, sleep: 9, attention: 1 },
    { daysAgo: 4, fever: 2, steps: '6000_8000', cond: 5, appetite: 8, sleep: 8, attention: 2 },
    { daysAgo: 3, fever: 2, steps: 'over_8000',  cond: 5, appetite: 9, sleep: 9, attention: 1 },
    { daysAgo: 2, fever: 2, steps: '6000_8000', cond: 5, appetite: 8, sleep: 8, attention: 2 },
    { daysAgo: 1, fever: 2, steps: 'over_8000',  cond: 5, appetite: 9, sleep: 9, attention: 1 },
    { daysAgo: 0, fever: 2, steps: '6000_8000', cond: 5, appetite: 8, sleep: 8, attention: 2 },
  ],
  [userIds.patient6]: [
    { daysAgo: 6, fever: 3, steps: '2000_4000', cond: 3, appetite: 5, sleep: 5, attention: 6 },
    { daysAgo: 5, fever: 4, steps: '2000_4000', cond: 3, appetite: 4, sleep: 4, attention: 7 },
    { daysAgo: 4, fever: 4, steps: 'under_2000', cond: 2, appetite: 4, sleep: 4, attention: 8 },
    { daysAgo: 3, fever: 3, steps: '2000_4000', cond: 3, appetite: 5, sleep: 5, attention: 7 },
    { daysAgo: 2, fever: 3, steps: '2000_4000', cond: 3, appetite: 5, sleep: 5, attention: 6 },
    { daysAgo: 1, fever: 3, steps: '4000_6000', cond: 4, appetite: 6, sleep: 6, attention: 5 },
    { daysAgo: 0, fever: 2, steps: '4000_6000', cond: 4, appetite: 6, sleep: 6, attention: 5 },
  ],
  [userIds.patient7]: [
    { daysAgo: 6, fever: 2, steps: '4000_6000', cond: 4, appetite: 7, sleep: 7, attention: 4 },
    { daysAgo: 5, fever: 2, steps: '4000_6000', cond: 4, appetite: 7, sleep: 7, attention: 3 },
    { daysAgo: 4, fever: 2, steps: '4000_6000', cond: 5, appetite: 8, sleep: 8, attention: 3 },
    { daysAgo: 3, fever: 2, steps: '6000_8000', cond: 5, appetite: 8, sleep: 8, attention: 2 },
    { daysAgo: 2, fever: 2, steps: '4000_6000', cond: 4, appetite: 7, sleep: 7, attention: 3 },
    { daysAgo: 1, fever: 2, steps: '4000_6000', cond: 5, appetite: 7, sleep: 7, attention: 3 },
    { daysAgo: 0, fever: 2, steps: '4000_6000', cond: 4, appetite: 7, sleep: 7, attention: 4 },
  ],
  [userIds.patient8]: [
    { daysAgo: 6, fever: 5, steps: 'under_2000', cond: 2, appetite: 3, sleep: 3, attention: 9 },
    { daysAgo: 5, fever: 5, steps: 'under_2000', cond: 2, appetite: 3, sleep: 3, attention: 9 },
    { daysAgo: 4, fever: 4, steps: 'under_2000', cond: 2, appetite: 4, sleep: 4, attention: 8 },
    { daysAgo: 3, fever: 4, steps: '2000_4000', cond: 3, appetite: 5, sleep: 5, attention: 7 },
    { daysAgo: 2, fever: 3, steps: '2000_4000', cond: 3, appetite: 5, sleep: 5, attention: 6 },
    { daysAgo: 1, fever: 3, steps: '2000_4000', cond: 3, appetite: 6, sleep: 6, attention: 6 },
    { daysAgo: 0, fever: 2, steps: '2000_4000', cond: 4, appetite: 6, sleep: 6, attention: 5 },
  ],
  [userIds.patient9]: [
    { daysAgo: 6, fever: 2, steps: '4000_6000', cond: 4, appetite: 6, sleep: 6, attention: 5 },
    { daysAgo: 5, fever: 3, steps: '2000_4000', cond: 3, appetite: 5, sleep: 5, attention: 6 },
    { daysAgo: 4, fever: 3, steps: '2000_4000', cond: 3, appetite: 5, sleep: 5, attention: 7 },
    { daysAgo: 3, fever: 2, steps: '4000_6000', cond: 4, appetite: 6, sleep: 6, attention: 5 },
    { daysAgo: 2, fever: 2, steps: '4000_6000', cond: 4, appetite: 7, sleep: 7, attention: 4 },
    { daysAgo: 1, fever: 2, steps: '4000_6000', cond: 4, appetite: 7, sleep: 7, attention: 4 },
    { daysAgo: 0, fever: 2, steps: '4000_6000', cond: 4, appetite: 7, sleep: 7, attention: 4 },
  ],
  [userIds.patient10]: [
    { daysAgo: 6, fever: 6, steps: 'under_2000', cond: 1, appetite: 2, sleep: 2, attention: 10 },
    { daysAgo: 5, fever: 6, steps: 'under_2000', cond: 2, appetite: 3, sleep: 3, attention: 9 },
    { daysAgo: 4, fever: 5, steps: 'under_2000', cond: 2, appetite: 3, sleep: 3, attention: 9 },
    { daysAgo: 3, fever: 5, steps: 'under_2000', cond: 2, appetite: 4, sleep: 4, attention: 8 },
    { daysAgo: 2, fever: 4, steps: '2000_4000', cond: 3, appetite: 5, sleep: 5, attention: 7 },
    { daysAgo: 1, fever: 4, steps: '2000_4000', cond: 3, appetite: 5, sleep: 5, attention: 7 },
    { daysAgo: 0, fever: 3, steps: '2000_4000', cond: 3, appetite: 6, sleep: 6, attention: 6 },
  ],
};

let logCount = 0;
for (const [patientId, patterns] of Object.entries(patientLogPatterns)) {
  for (const p of patterns) {
    const loggedAt = new Date();
    loggedAt.setDate(loggedAt.getDate() - p.daysAgo);
    loggedAt.setHours(9, 0, 0, 0);
    insertLog.run({
      id: uuidv4(), patient_id: patientId, logged_at: loggedAt.toISOString(),
      fever_score: p.fever, steps_yesterday: p.steps, condition: p.cond,
      appetite_score: p.appetite, sleep_quality: p.sleep,
      attention_score: p.attention, note: null, status: 'unchecked',
    });
    logCount++;
  }
}

console.log(`[seed] daily_logs: ${logCount}件投入完了`);

// ============================================================
// consultation_topics
// ============================================================
const insertTopic = db.prepare(`
  INSERT INTO consultation_topics (id, label, icon, sort_order, is_active, created_at)
  VALUES (@id, @label, @icon, @sort_order, @is_active, @created_at)
`);
insertTopic.run({ id: uuidv4(), label: '体調',   icon: 'ti-thermometer', sort_order: 1, is_active: 1, created_at: now });
insertTopic.run({ id: uuidv4(), label: '生活',   icon: 'ti-heart',       sort_order: 2, is_active: 1, created_at: now });
insertTopic.run({ id: uuidv4(), label: '学業',   icon: 'ti-book',        sort_order: 3, is_active: 1, created_at: now });
insertTopic.run({ id: uuidv4(), label: 'その他', icon: 'ti-dots',        sort_order: 4, is_active: 1, created_at: now });

console.log('[seed] consultation_topics: 4件投入完了');

// ============================================================
// ai_providers
// ============================================================
db.prepare(`
  INSERT INTO ai_providers (id, name, provider_type, endpoint, api_key, model, active, created_at)
  VALUES (@id, @name, @provider_type, @endpoint, @api_key, @model, @active, @created_at)
`).run({ id: uuidv4(), name: 'GPT-5-nano', provider_type: 'openai', endpoint: 'https://api.openai.com/v1', api_key: null, model: 'gpt-5-nano', active: 0, created_at: now });

console.log('[seed] ai_providers: 1件投入完了');

// ============================================================
// system_settings
// ============================================================
db.prepare(`
  INSERT OR REPLACE INTO system_settings (key, value, updated_at)
  VALUES ('system_prompt', ?, DATETIME('now'))
`).run('あなたは相談者の健康状態をサポートするAIアシスタントです。\n医師の診断や処方の代替は禁止です。症状が重い場合は必ず医師への相談を促してください。');

console.log('[seed] system_settings: 1件投入完了');
console.log('[seed] シードデータの投入が完了しました');
console.log('');
console.log('[seed] ログイン情報:');
console.log('  admin    / Admin1234!   (管理者)');
console.log('  aoyama   / Doctor1234!  (医師)');
console.log('  hayashi  / Doctor1234!  (医師)');
console.log('  shimizu  / Nurse1234!   (看護師)');
console.log('  nishida  / Nurse1234!   (看護師)');
console.log('  sakura01〜tani10 / User1234! (学生 10名)');
