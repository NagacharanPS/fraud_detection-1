import { DatabaseSync } from "node:sqlite";
import path from "path";
import fs from "fs";

const DB_PATHS = [
  path.resolve(process.cwd(), "fraud_detection.db"),
  path.resolve(process.cwd(), "dataset/fraud_detection.db"),
  path.resolve(process.cwd(), "backend/database/fraud_detection.db"),
];

function getDatabases(): DatabaseSync[] {
  const dbs: DatabaseSync[] = [];
  for (const dbPath of DB_PATHS) {
    try {
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const db = new DatabaseSync(dbPath);
      db.exec("PRAGMA journal_mode = WAL;");
      db.exec("PRAGMA foreign_keys = ON;");
      dbs.push(db);
    } catch (err) {
      console.warn(`[authDatabase] Could not open db at ${dbPath}:`, err);
    }
  }
  return dbs;
}

let initialized = false;

export function initializeDatabaseTables(): void {
  if (initialized) return;
  const dbs = getDatabases();
  for (const db of dbs) {
    try {
      // 1. Dedicated `users` credentials & biometrics table in fraud_detection database
      db.exec(`
        CREATE TABLE IF NOT EXISTS users (
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
        );
      `);

      // Add missing columns if migrating an older database
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
          db.exec(`ALTER TABLE users ADD COLUMN ${col};`);
        } catch {
          // Column already exists
        }
      }

      try {
        db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_or_upi ON users (email_or_upi_id);`);
      } catch {
        // Index exists
      }

      // 2. Ensure `transactions` table exists alongside `users` in fraud_detection database
      const hasTransactions = db.prepare(
        "SELECT name FROM sqlite_master WHERE type IN ('table', 'view') AND name = 'transactions'"
      ).all();

      if (!hasTransactions || hasTransactions.length === 0) {
        const hasRaw = db.prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'raw_transactions_50k'"
        ).all();
        if (hasRaw && hasRaw.length > 0) {
          try {
            db.exec(`
              CREATE TABLE IF NOT EXISTS transactions AS SELECT * FROM raw_transactions_50k;
              CREATE INDEX IF NOT EXISTS idx_transactions_id ON transactions (transaction_id);
              CREATE INDEX IF NOT EXISTS idx_transactions_sender ON transactions (sender_account);
              CREATE INDEX IF NOT EXISTS idx_transactions_receiver ON transactions (receiver_account);
            `);
          } catch (e) {
            console.warn("[authDatabase] Notice creating transactions table:", e);
          }
        }
      }

      // User credentials view alias
      try {
        db.exec(`
          CREATE VIEW IF NOT EXISTS user_credentials AS 
          SELECT user_id, full_name, email_or_upi_id, password_hash, face_data, created_at 
          FROM users;
        `);
      } catch {
        // View exists
      }
    } catch (err) {
      console.warn("[authDatabase] Init error on db:", err);
    }
  }
  initialized = true;
}

export function ensureTables(): void {
  initializeDatabaseTables();
}

export function getAllUsers(): any[] {
  ensureTables();
  const dbs = getDatabases();
  for (const db of dbs) {
    try {
      const rows = db.prepare(`
        SELECT user_id, full_name, email_or_upi_id, email, phone_number, password_hash, salt, account_id, face_data, face_embedding, template_hash, algorithm_version, enrolled_at, created_at
        FROM users
      `).all();
      if (rows && rows.length > 0) {
        return rows as any[];
      }
    } catch {
      // Continue
    }
  }
  return [];
}

export function findUser(identifier: string): any | null {
  ensureTables();
  const dbs = getDatabases();
  const cleanPhone = identifier.replace(/\D/g, "");
  const normalized = identifier.toLowerCase().trim();
  const withDomain = normalized.includes("@") && !normalized.includes(".") ? `${normalized}.com` : normalized;
  const username = normalized.split("@")[0];

  for (const db of dbs) {
    try {
      const stmt = db.prepare(`
        SELECT user_id, full_name, email_or_upi_id, email, phone_number, password_hash, salt, account_id, face_data, face_embedding, template_hash, algorithm_version, enrolled_at, created_at
        FROM users
        WHERE email_or_upi_id = ? 
           OR email = ? 
           OR email_or_upi_id = ? 
           OR email = ? 
           OR email_or_upi_id LIKE ?
           OR phone_number = ? 
           OR account_id = ? 
           OR user_id = ?
        LIMIT 1
      `);
      const row = stmt.get(
        normalized,
        normalized,
        withDomain,
        withDomain,
        `${username}%`,
        cleanPhone || normalized,
        identifier.toUpperCase(),
        identifier
      );
      if (row) {
        return row;
      }
    } catch {
      // Continue
    }
  }
  return null;
}

export function insertUser(user: {
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
}): void {
  ensureTables();
  const dbs = getDatabases();
  const emailOrUpi = user.email_or_upi_id || user.email;
  const embeddingJson = user.face_embedding ? JSON.stringify(user.face_embedding) : null;
  const faceData = user.face_data || embeddingJson || "";

  for (const db of dbs) {
    try {
      const stmt = db.prepare(`
        INSERT INTO users (
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
          enrolled_at = excluded.enrolled_at
      `);
      stmt.run(
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
        user.algorithm_version || "opencv-yunet-sface-2021dec"
      );
    } catch (err) {
      console.warn("[authDatabase] Error inserting user to DB:", err);
    }
  }
}

export function seedDefaultUsers(demoUsers: any[]): void {
  ensureTables();
  for (const u of demoUsers) {
    try {
      insertUser({
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

export function deleteUserData(userId: string): void {
  ensureTables();
  const dbs = getDatabases();
  for (const db of dbs) {
    try {
      db.prepare("DELETE FROM users WHERE user_id = ?").run(userId);
    } catch {
      // Continue
    }
  }
}
