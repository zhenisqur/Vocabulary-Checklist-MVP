import sqlite3 from "sqlite3";
import path from "path";
import fs from "fs";

export interface Word {
  id: number;
  word: string;
  meaning: string;
  status: 'active' | 'buried' | 'revived';
  death_count: number;
  user_id?: number;
}

const dataDir = path.resolve(__dirname, "data");
const dbPath = path.join(dataDir, "app.db");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error("❌ Ошибка базы:", err.message);
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      username TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word TEXT NOT NULL,
      meaning TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      death_count INTEGER DEFAULT 0,
      user_id INTEGER
    )
  `);

  db.run("ALTER TABLE words ADD COLUMN user_id INTEGER", (err) => {
  });

  db.run("UPDATE words SET user_id = 1 WHERE user_id IS NULL", (err) => {
  });

  // 5. МИГРАЦИЯ: Исправляем пустые статусы
  db.run("UPDATE words SET status = 'active' WHERE status IS NULL OR status = ''");


  
  db.get("SELECT COUNT(*) as count FROM words WHERE user_id = 1", (err, row: any) => {
  });
});
db.run("ALTER TABLE users ADD COLUMN avatarUrl TEXT", (err) => {
});

db.run("ALTER TABLE users ADD COLUMN level INTEGER DEFAULT 1", (err) => {
});

db.run("ALTER TABLE words ADD COLUMN revive_count INTEGER DEFAULT 0", (err) => {
});
export default db;