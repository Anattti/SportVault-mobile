import * as SQLite from 'expo-sqlite';

// Define database name
const DB_NAME = 'sportvault.db';

// Open database synchronously (new API in expo-sqlite/next allows async but sync is often easier for simple hook)
// But we want to use the new API if possible. 
// Expo 50+ recommend `openDatabaseAsync` or `openDatabaseSync`.
// Let's use `openDatabaseAsync`.

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
    await initDB(dbInstance);
  }
  return dbInstance;
}

async function initDB(db: SQLite.SQLiteDatabase) {
  // Use `execAsync` for multiple statements
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    
    -- Sync Queue Table
    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      operation TEXT NOT NULL,
      data TEXT NOT NULL, -- JSON
      timestamp INTEGER NOT NULL,
      retry_count INTEGER DEFAULT 0,
      last_error TEXT
    );

    -- Documents Cache (for generic key-value storage)
    CREATE TABLE IF NOT EXISTS documents (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL, -- JSON
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    -- Active Session Storage
    CREATE TABLE IF NOT EXISTS active_session (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL, -- JSON
      created_at INTEGER NOT NULL
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_sync_timestamp ON sync_queue(timestamp);
    CREATE INDEX IF NOT EXISTS idx_documents_updated ON documents(updated_at);
  `);
  
  console.log('[SQLite] Database initialized');
}

// Helper to run transaction-like batch
// Note: expo-sqlite 14 (latest) simplifies this. 
// We can just use `db.runAsync`, `db.getAllAsync` etc.

// Generic query wrapper is maybe not needed if we expose getDB()
