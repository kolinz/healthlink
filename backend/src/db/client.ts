import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// ルートディレクトリの .env を読み込む
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

// DATABASE_PATH はルート相対パスで指定されているため、ルートから解決する
const DATABASE_PATH = path.resolve(
  process.cwd(), '..',
  process.env.DATABASE_PATH ?? 'backend/data/healthlink.db'
);

const dataDir = path.dirname(DATABASE_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log(`[DB] データディレクトリを作成しました: ${dataDir}`);
}

const db = new Database(DATABASE_PATH);

db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

console.log(`[DB] 接続完了: ${DATABASE_PATH}`);

export default db;
