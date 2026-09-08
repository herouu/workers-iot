// SQLite 数据库连接 + 初始化
import Database from 'better-sqlite3';
import { config } from '../config';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

// 确保数据目录存在
mkdirSync(dirname(config.dbPath), { recursive: true });

export const db = new Database(config.dbPath);

// WAL 模式提升读写性能
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

// 初始化表结构
export function initDatabase() {
  db.exec(`
    -- 设备表
    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      name TEXT,
      type TEXT DEFAULT 'unknown',
      mac_address TEXT UNIQUE,
      secret_hash TEXT,
      salt TEXT,
      online INTEGER DEFAULT 0,
      protocol TEXT DEFAULT 'http',
      last_seen INTEGER,
      config TEXT,
      created_at INTEGER DEFAULT (strftime('%s','now'))
    );

    -- 遥测数据
    CREATE TABLE IF NOT EXISTS telemetry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      data TEXT NOT NULL,
      source TEXT DEFAULT 'http',
      timestamp INTEGER NOT NULL,
      synced INTEGER DEFAULT 0
    );

    -- 命令队列
    CREATE TABLE IF NOT EXISTS commands (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL,
      command TEXT NOT NULL,
      params TEXT,
      status TEXT DEFAULT 'pending',
      source TEXT DEFAULT 'http',
      created_at INTEGER,
      sent_at INTEGER,
      acked_at INTEGER
    );

    -- 规则表
    CREATE TABLE IF NOT EXISTS rules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      condition TEXT NOT NULL,
      action TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s','now'))
    );

    -- 网关配置
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at INTEGER DEFAULT (strftime('%s','now'))
    );

    -- 索引
    CREATE INDEX IF NOT EXISTS idx_telemetry_device_time ON telemetry(device_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_telemetry_synced ON telemetry(synced);
    CREATE INDEX IF NOT EXISTS idx_commands_device_status ON commands(device_id, status);
    CREATE INDEX IF NOT EXISTS idx_devices_online ON devices(online);
    CREATE INDEX IF NOT EXISTS idx_devices_last_seen ON devices(last_seen);
  `);
}
