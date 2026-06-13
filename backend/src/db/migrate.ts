import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import dotenv from 'dotenv';

// ルートディレクトリの .env を読み込む
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

// DATABASE_PATH はルート相対パスで指定されているため、ルートから解決する
const DATABASE_PATH = path.resolve(
  process.cwd(), '..',
  process.env.DATABASE_PATH ?? 'backend/data/healthlink.db'
);

const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

const isFresh = process.argv.includes('--fresh');

if (isFresh && fs.existsSync(DATABASE_PATH)) {
  fs.unlinkSync(DATABASE_PATH);
  console.log(`[migrate] 既存DBを削除しました: ${DATABASE_PATH}`);
}

const dataDir = path.dirname(DATABASE_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
const db = new Database(DATABASE_PATH);

db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');
db.exec(schema);

console.log('[migrate] スキーマの適用が完了しました');

db.close();
