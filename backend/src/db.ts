import initSqlJs, { Database as SqlJsDatabase, Statement } from 'sql.js';
import path from 'path';
import fs from 'fs';

const dbDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'recycling.db');

class StatementWrapper {
  constructor(private stmt: Statement, private triggerSave: () => void) {}

  run(...params: any[]): { lastInsertRowid: number; changes: number } {
    this.stmt.bind(params);
    this.stmt.step();
    const lastId = (dbHandle as any).exec('SELECT last_insert_rowid() as id')[0]?.values?.[0]?.[0] || 0;
    const changes = (dbHandle as any).exec('SELECT changes() as c')[0]?.values?.[0]?.[0] || 0;
    this.stmt.reset();
    this.triggerSave();
    return { lastInsertRowid: lastId, changes };
  }

  get(...params: any[]): any {
    this.stmt.bind(params);
    if (this.stmt.step()) {
      const row = this.stmt.getAsObject();
      this.stmt.reset();
      return row;
    }
    this.stmt.reset();
    return undefined;
  }

  all(...params: any[]): any[] {
    const results: any[] = [];
    this.stmt.bind(params);
    while (this.stmt.step()) {
      results.push(this.stmt.getAsObject());
    }
    this.stmt.reset();
    return results;
  }
}

let dbHandle: SqlJsDatabase | null = null;
let saveTimeout: NodeJS.Timeout | null = null;

type TxFn<T = any> = (...args: any[]) => T;

function transaction<T>(fn: TxFn<T>) {
  return (...args: any[]): T => {
    if (!dbHandle) throw new Error('数据库未初始化');
    dbHandle!.exec('BEGIN;');
    try {
      const result = fn(...args) as T;
      dbHandle!.exec('COMMIT;');
      scheduleSave();
      return result;
    } catch (e) {
      try { dbHandle!.exec('ROLLBACK;'); } catch {}
      scheduleSave();
      throw e;
    }
  };
}

const saveToDisk = () => {
  if (!dbHandle) return;
  try {
    const data = dbHandle.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  } catch (e) {
    console.error('保存数据库失败:', e);
  }
};

const scheduleSave = () => {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(saveToDisk, 300);
};

const prepare = (sql: string): StatementWrapper => {
  if (!dbHandle) throw new Error('数据库未初始化');
  return new StatementWrapper(dbHandle.prepare(sql), scheduleSave);
};

const exec = (sql: string) => {
  if (!dbHandle) throw new Error('数据库未初始化');
  const stmts = sql.split(';').map((s) => s.trim()).filter(Boolean);
  stmts.forEach((s) => dbHandle!.run(s));
  scheduleSave();
};

const pragma = (expr: string) => {
  if (!dbHandle) return;
  try {
    dbHandle.exec(`PRAGMA ${expr};`);
  } catch {}
};

let dbReadyResolve: () => void;
const dbReady = new Promise<void>((res) => (dbReadyResolve = res));

const initSchema = () => {
  if (!dbHandle) return;
  const tables = dbHandle.exec("SELECT name FROM sqlite_master WHERE type='table'");
  exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      realName TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL CHECK(role IN ('resident', 'collector', 'admin')),
      address TEXT,
      community TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      unit TEXT NOT NULL,
      pointsPerUnit INTEGER NOT NULL,
      description TEXT NOT NULL,
      tips TEXT NOT NULL,
      icon TEXT NOT NULL,
      sort INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      residentId INTEGER NOT NULL,
      collectorId INTEGER,
      address TEXT NOT NULL,
      expectedDate TEXT NOT NULL,
      expectedTimeSlot TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'completed', 'cancelled')),
      estimatedPoints INTEGER NOT NULL DEFAULT 0,
      actualPoints INTEGER,
      rating INTEGER CHECK(rating BETWEEN 1 AND 5),
      comment TEXT,
      photoUrl TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      acceptedAt TEXT,
      completedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS appointment_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      appointmentId INTEGER NOT NULL,
      categoryId INTEGER NOT NULL,
      estimatedQuantity REAL NOT NULL,
      actualQuantity REAL
    );

    CREATE TABLE IF NOT EXISTS points_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER UNIQUE NOT NULL,
      currentPoints INTEGER NOT NULL DEFAULT 0,
      lastYearPoints INTEGER NOT NULL DEFAULT 0,
      currentYear INTEGER NOT NULL,
      updatedAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS points_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('earn', 'spend', 'rollover')),
      points INTEGER NOT NULL,
      balance INTEGER NOT NULL,
      year INTEGER NOT NULL,
      description TEXT NOT NULL,
      appointmentId INTEGER,
      exchangeId INTEGER,
      createdAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS exchange_products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      pointsCost INTEGER NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      image TEXT NOT NULL,
      category TEXT NOT NULL,
      sort INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS exchange_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      productId INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      totalPoints INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'shipped', 'delivered', 'cancelled')),
      address TEXT,
      recipientPhone TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      shippedAt TEXT,
      deliveredAt TEXT
    );

    CREATE TABLE IF NOT EXISTS time_slot_capacity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      timeSlot TEXT NOT NULL,
      maxCapacity INTEGER NOT NULL DEFAULT 5,
      currentCount INTEGER NOT NULL DEFAULT 0,
      UNIQUE(date, timeSlot)
    );
  `);
  try {
    exec('CREATE INDEX IF NOT EXISTS idx_appointments_resident ON appointments(residentId)');
    exec('CREATE INDEX IF NOT EXISTS idx_appointments_collector ON appointments(collectorId)');
    exec('CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status)');
    exec('CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(expectedDate)');
    exec('CREATE INDEX IF NOT EXISTS idx_points_records_user ON points_records(userId)');
    exec('CREATE INDEX IF NOT EXISTS idx_points_records_year ON points_records(year)');
  } catch {}
};

(async function init() {
  const SQL = await initSqlJs({
    locateFile: (file: string) =>
      `file:///${path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', file).replace(/\\/g, '/')}`,
  });

  let existing: Uint8Array | undefined;
  if (fs.existsSync(dbPath)) {
    try {
      const buffer = fs.readFileSync(dbPath);
      existing = new Uint8Array(buffer);
    } catch {}
  }

  dbHandle = new SQL.Database(existing);
  pragma('foreign_keys = ON');
  initSchema();
  saveToDisk();
  dbReadyResolve();
})();

const db = {
  prepare,
  exec,
  pragma,
  transaction,
};

export { db as default, dbReady, saveToDisk };
