import Database from "better-sqlite3"
import path from "path"

const globalForDb = globalThis as unknown as {
  db: Database.Database | undefined
}

function createDb() {
  const dbPath = path.resolve(process.cwd(), "dev.db")
  const db = new Database(dbPath)
  db.pragma("journal_mode = WAL")
  db.pragma("foreign_keys = ON")
  return db
}

export const db = globalForDb.db ?? createDb()

if (process.env.NODE_ENV !== "production") globalForDb.db = db

export function queryAll<T>(sql: string, ...params: unknown[]): T[] {
  return db.prepare(sql).all(...params) as T[]
}

export function queryOne<T>(sql: string, ...params: unknown[]): T | undefined {
  return db.prepare(sql).get(...params) as T | undefined
}

export function execute(sql: string, ...params: unknown[]): Database.RunResult {
  return db.prepare(sql).run(...params)
}
