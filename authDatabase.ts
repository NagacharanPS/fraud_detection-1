import sqlite3 from "sqlite3";
import path from "path";

let database: sqlite3.Database | null = null;

function getDatabase(): sqlite3.Database {
  if (!database) {
    database = new sqlite3.Database(path.resolve(process.cwd(), process.env.SQLITE_DB_PATH || "backend/database/fraud_detection.db"));
    database.run("PRAGMA foreign_keys = ON");
  }
  return database;
}

function run(sql: string, params: any[] = []): Promise<void> {
  return new Promise((resolve, reject) => getDatabase().run(sql, params, (error) => error ? reject(error) : resolve()));
}

function all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => getDatabase().all(sql, params, (error, rows) => error ? reject(error) : resolve(rows as T[])));
}

let initialized: Promise<void> | null = null;
async function initializeTables(): Promise<void> {
  await run(`CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
    salt TEXT NOT NULL, full_name TEXT NOT NULL, phone_number TEXT NOT NULL UNIQUE,
    account_id TEXT, face_embedding TEXT, template_hash TEXT,
    algorithm_version TEXT DEFAULT 'opencv-yunet-sface-2021dec',
    enrolled_at DATETIME, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  for (const column of [
    "face_embedding TEXT",
    "template_hash TEXT",
    "algorithm_version TEXT DEFAULT 'opencv-yunet-sface-2021dec'",
    "enrolled_at DATETIME",
  ]) {
    try { await run(`ALTER TABLE users ADD COLUMN ${column}`); } catch { /* Column already exists. */ }
  }
  await run(`CREATE TABLE IF NOT EXISTS user_face_biometrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL UNIQUE,
    face_embedding TEXT NOT NULL, template_hash TEXT NOT NULL,
    algorithm_version TEXT DEFAULT 'opencv-yunet-sface-2021dec', enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  await run(`UPDATE users SET
    face_embedding = (SELECT face_embedding FROM user_face_biometrics WHERE user_face_biometrics.user_id = users.user_id),
    template_hash = (SELECT template_hash FROM user_face_biometrics WHERE user_face_biometrics.user_id = users.user_id),
    algorithm_version = (SELECT algorithm_version FROM user_face_biometrics WHERE user_face_biometrics.user_id = users.user_id),
    enrolled_at = (SELECT enrolled_at FROM user_face_biometrics WHERE user_face_biometrics.user_id = users.user_id)
    WHERE EXISTS (SELECT 1 FROM user_face_biometrics WHERE user_face_biometrics.user_id = users.user_id)`);
  await run("DROP TABLE IF EXISTS user_face_biometrics");
}

function ensureTables(): Promise<void> {
  if (!initialized) initialized = initializeTables();
  return initialized;
}

export async function findUser(identifier: string): Promise<any | null> {
  await ensureTables();
  const rows = await all(
    "SELECT user_id, email, password_hash, salt, full_name, phone_number, account_id, face_embedding, template_hash, algorithm_version, enrolled_at, created_at FROM users WHERE email = ? OR phone_number = ? OR account_id = ? OR user_id = ? LIMIT 1",
    [identifier.toLowerCase(), identifier.replace(/\D/g, ""), identifier.toUpperCase(), identifier],
  );
  return rows[0] || null;
}

export async function insertUser(user: any): Promise<void> {
  await ensureTables();
  await run(
    "INSERT INTO users (user_id, email, password_hash, salt, full_name, phone_number, account_id, face_embedding, template_hash, algorithm_version, enrolled_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))",
    [user.user_id, user.email, user.password_hash, user.salt, user.full_name, user.phone_number, user.account_id, JSON.stringify(user.face_embedding), user.template_hash, user.algorithm_version],
  );
}

export async function deleteUserData(userId: string): Promise<void> {
  await ensureTables();
  await run("DELETE FROM users WHERE user_id = ?", [userId]);
}

export async function checkDatabaseConnection(): Promise<void> {
  await ensureTables();
  await all("SELECT 1");
}
