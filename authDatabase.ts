import sqlite3 from "sqlite3";
import path from "path";
import fs from "fs";

const DB_PATHS = [
  path.resolve(process.cwd(), "fraud_detection.db"),
  path.resolve(process.cwd(), "dataset/fraud_detection.db"),
  path.resolve(process.cwd(), "backend/database/fraud_detection.db"),
];

function getDatabases(): sqlite3.Database[] {
  const dbs: sqlite3.Database[] = [];
  for (const dbPath of DB_PATHS) {
    try {
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const db = new sqlite3.Database(dbPath);
      db.run("PRAGMA journal_mode = WAL;");
      db.run("PRAGMA foreign_keys = ON;");
      dbs.push(db);
    } catch (err) {
      console.warn(`[authDatabase] Could not open db at ${dbPath}:`, err);
    }
  }
  return dbs;
}

function runOnDb(db: sqlite3.Database, sql: string, params: any[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function allFromDb<T = any>(db: sqlite3.Database, sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows as T[]);
    });
  });
}

let initPromise: Promise<void> | null = null;

export async function initializeDatabaseTables(): Promise<void> {
  const dbs = getDatabases();
  for (const db of dbs) {
    try {
      // 1. Create dedicated `users` credentials & biometrics table in fraud_detection database
      await runOnDb(
        db,
        `CREATE TABLE IF NOT EXISTS users (
          user_id TEXT PRIMARY KEY,
          full_name TEXT NOT NULL,
          email_or_upi_id TEXT NOT NULL UNIQUE,
          email TEXT,
          phone_number TEXT,
          password_hash TEXT NOT NULL,
          salt TEXT,
          account_id TEXT,
          face_data TEXT,
          face_embedding TEXT,
          template_hash TEXT,
          algorithm_version TEXT DEFAULT 'opencv-yunet-sface-2021dec',
          enrolled_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
      );

      // Add missing columns if migrating existing table
      const columnsToAdd = [
        "full_name TEXT",
        "email_or_upi_id TEXT",
        "email TEXT",
        "phone_number TEXT",
        "password_hash TEXT",
        "salt TEXT",
        "account_id TEXT",
        "face_data TEXT",
        "face_embedding TEXT",
        "template_hash TEXT",
        "algorithm_version TEXT DEFAULT 'opencv-yunet-sface-2021dec'",
        "enrolled_at DATETIME",
        "created_at DATETIME DEFAULT CURRENT_TIMESTAMP",
      ];
      for (const col of columnsToAdd) {
        try {
          await runOnDb(db, `ALTER TABLE users ADD COLUMN ${col}`);
        } catch {
          // Column already exists
        }
      }

      // Create unique index on email_or_upi_id if not exists
      try {
        await runOnDb(db, `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_or_upi ON users (email_or_upi_id)`);
      } catch {
        // Index exists
      }

      // 2. Ensure `transactions` table exists in fraud_detection database alongside `users`
      const hasTransactions = await allFromDb(
        db,
        `SELECT name FROM sqlite_master WHERE type IN ('table', 'view') AND name = 'transactions'`
      );

      if (!hasTransactions || hasTransactions.length === 0) {
        const hasRaw = await allFromDb(
          db,
          `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'raw_transactions_50k'`
        );
        if (hasRaw && hasRaw.length > 0) {
          try {
            await runOnDb(db, `CREATE TABLE IF NOT EXISTS transactions AS SELECT * FROM raw_transactions_50k`);
            await runOnDb(db, `CREATE INDEX IF NOT EXISTS idx_transactions_id ON transactions (transaction_id)`);
            await runOnDb(db, `CREATE INDEX IF NOT EXISTS idx_transactions_sender ON transactions (sender_account)`);
            await runOnDb(db, `CREATE INDEX IF NOT EXISTS idx_transactions_receiver ON transactions (receiver_account)`);
          } catch (e) {
            console.warn("[authDatabase] Notice creating transactions table:", e);
          }
        }
      }

      // Also create alias view `user_credentials` for explicit query support
      try {
        await runOnDb(db, `CREATE VIEW IF NOT EXISTS user_credentials AS SELECT user_id, full_name, email_or_upi_id, password_hash, face_data, created_at FROM users`);
      } catch {
        // View exists
      }
    } catch (err) {
      console.warn("[authDatabase] Init error on db:", err);
    }
  }
}

export function ensureTables(): Promise<void> {
  if (!initPromise) {
    initPromise = initializeDatabaseTables();
  }
  return initPromise;
}

export async function findUser(identifier: string): Promise<any | null> {
  await ensureTables();
  const dbs = getDatabases();
  const cleanPhone = identifier.replace(/\D/g, "");
  const normalized = identifier.toLowerCase().trim();

  for (const db of dbs) {
    try {
      const rows = await allFromDb(
        db,
        `SELECT user_id, full_name, email_or_upi_id, email, phone_number, password_hash, salt, account_id, face_data, face_embedding, template_hash, algorithm_version, enrolled_at, created_at
         FROM users
         WHERE email_or_upi_id = ? OR email = ? OR phone_number = ? OR account_id = ? OR user_id = ?
         LIMIT 1`,
        [normalized, normalized, cleanPhone || normalized, identifier.toUpperCase(), identifier]
      );
      if (rows && rows.length > 0) {
        return rows[0];
      }
    } catch {
      // Continue to next db fallback
    }
  }
  return null;
}

export async function insertUser(user: {
  user_id: string;
  full_name: string;
  email_or_upi_id?: string;
  email: string;
  phone_number?: string;
  password_hash: string;
  salt?: string;
  account_id?: string;
  face_data?: string;
  face_embedding?: any;
  template_hash?: string;
  algorithm_version?: string;
}): Promise<void> {
  await ensureTables();
  const dbs = getDatabases();
  const emailOrUpi = user.email_or_upi_id || user.email;
  const embeddingJson = user.face_embedding ? JSON.stringify(user.face_embedding) : null;
  const faceData = user.face_data || embeddingJson || "";

  for (const db of dbs) {
    try {
      await runOnDb(
        db,
        `INSERT INTO users (
          user_id, full_name, email_or_upi_id, email, phone_number,
          password_hash, salt, account_id, face_data, face_embedding,
          template_hash, algorithm_version, enrolled_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        ON CONFLICT(user_id) DO UPDATE SET
          full_name = excluded.full_name,
          email_or_upi_id = excluded.email_or_upi_id,
          email = excluded.email,
          phone_number = excluded.phone_number,
          password_hash = excluded.password_hash,
          salt = excluded.salt,
          account_id = excluded.account_id,
          face_data = excluded.face_data,
          face_embedding = excluded.face_embedding,
          template_hash = excluded.template_hash,
          algorithm_version = excluded.algorithm_version,
          enrolled_at = excluded.enrolled_at`,
        [
          user.user_id,
          user.full_name,
          emailOrUpi,
          user.email,
          user.phone_number || "",
          user.password_hash,
          user.salt || "",
          user.account_id || "",
          faceData,
          embeddingJson,
          user.template_hash || "",
          user.algorithm_version || "opencv-yunet-sface-2021dec",
        ]
      );
    } catch (err) {
      console.warn("[authDatabase] Error inserting user to DB:", err);
    }
  }
}

export async function seedDefaultUsers(demoUsers: any[]): Promise<void> {
  await ensureTables();
  for (const u of demoUsers) {
    try {
      await insertUser({
        user_id: u.user_id,
        full_name: u.full_name,
        email_or_upi_id: u.email || u.upi_id,
        email: u.email,
        phone_number: u.phone_number,
        password_hash: u.password_hash,
        salt: u.salt,
        account_id: u.account_id,
        face_data: u.face_data || `[SIMULATED_128D_BIOMETRIC_VECTOR_${u.user_id}]`,
        face_embedding: u.face_embedding,
        template_hash: u.template_hash,
        algorithm_version: u.algorithm_version || "v2.1-liveness-enclave",
      });
    } catch (err) {
      console.warn(`[authDatabase] Could not seed user ${u.user_id}:`, err);
    }
  }
}

export async function deleteUserData(userId: string): Promise<void> {
  await ensureTables();
  const dbs = getDatabases();
  for (const db of dbs) {
    try {
      await runOnDb(db, "DELETE FROM users WHERE user_id = ?", [userId]);
    } catch {
      // Continue
    }
  }
}
