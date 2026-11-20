// Andmebaas: Node.js sisseehitatud SQLite (node:sqlite). Üks fail, varundamiseks piisab
// faili kopeerimisest. Asukoht: DATA_DIR/eservice.db (vaikimisi ./data).
const path = require("node:path");
const fs = require("node:fs");

// node:sqlite annab Node 22-s "ExperimentalWarning" hoiatuse; vaigistame ainult selle ühe.
const origEmit = process.emitWarning;
process.emitWarning = function (w, ...rest) {
  const text = typeof w === "string" ? w : w && w.message;
  if (text && text.includes("SQLite is an experimental feature")) return;
  return origEmit.call(process, w, ...rest);
};
const { DatabaseSync } = require("node:sqlite");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS inquiries (
  id TEXT PRIMARY KEY,
  idem_key TEXT UNIQUE,
  created_at TEXT NOT NULL,
  service_slug TEXT NOT NULL,
  service_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Uus',
  notify_state TEXT NOT NULL DEFAULT 'ootel',
  notify_attempts INTEGER NOT NULL DEFAULT 0,
  notify_log TEXT NOT NULL DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS inquiry_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inquiry_id TEXT NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  orig_name TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  size INTEGER NOT NULL,
  mime TEXT
);
CREATE TABLE IF NOT EXISTS funnel (k TEXT PRIMARY KEY, n INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  email TEXT NOT NULL,
  pass_hash TEXT
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  csrf TEXT NOT NULL,
  expires INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS cms_services (
  slug TEXT PRIMARY KEY,
  published TEXT NOT NULL,
  draft TEXT,
  state TEXT NOT NULL DEFAULT 'avaldatud',
  owner TEXT,
  interval_months INTEGER NOT NULL DEFAULT 6,
  last_reviewed TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  comment TEXT NOT NULL DEFAULT '',
  submitted_at TEXT
);
CREATE TABLE IF NOT EXISTS cms_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL,
  at TEXT NOT NULL,
  by_user TEXT NOT NULL,
  act TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS notifications (
  k TEXT PRIMARY KEY,
  at TEXT NOT NULL,
  recipients TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  state TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (k TEXT PRIMARY KEY, v TEXT NOT NULL);
`;

let db = null;

function open(file) {
  if (db) return db;
  // `node --test` käivitab testid eraldi protsessides (NODE_TEST_CONTEXT); siis mälupõhine baas.
  const target = file || process.env.DB_FILE || (process.env.NODE_TEST_CONTEXT ? ":memory:" : null) || path.join(process.env.DATA_DIR || path.join(__dirname, "..", "data"), "eservice.db");
  if (target !== ":memory:") fs.mkdirSync(path.dirname(target), { recursive: true });
  db = new DatabaseSync(target);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  db.exec(SCHEMA);
  return db;
}

function get() { return db || open(); }

function close() { if (db) { db.close(); db = null; } }

// Väike abi tehingute jaoks
function tx(fn) {
  const d = get();
  d.exec("BEGIN");
  try { const r = fn(d); d.exec("COMMIT"); return r; } catch (e) { d.exec("ROLLBACK"); throw e; }
}

function getSetting(k, dflt) {
  const r = get().prepare("SELECT v FROM settings WHERE k = ?").get(k);
  return r ? JSON.parse(r.v) : dflt;
}
function setSetting(k, v) {
  get().prepare("INSERT INTO settings (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v").run(k, JSON.stringify(v));
}

module.exports = { open, get, close, tx, getSetting, setSetting };
