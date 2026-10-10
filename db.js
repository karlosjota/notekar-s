const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const dbFile = process.env.DB_PATH || path.join(__dirname, 'data', 'notekar.sqlite');

if (dbFile !== ':memory:') {
  fs.mkdirSync(path.dirname(path.resolve(dbFile)), { recursive: true });
}

const db = new Database(dbFile);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

db.exec(`
  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE INDEX IF NOT EXISTS idx_notes_updated_at
    ON notes (updated_at DESC, id DESC);
`);

module.exports = db;
