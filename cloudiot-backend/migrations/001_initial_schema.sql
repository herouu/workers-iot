-- WorkersIoT Database Schema
-- Version: 1.0.0

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  avatar TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- 设备表
CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  model TEXT,
  room TEXT,
  icon TEXT DEFAULT '📱',
  mac_address TEXT,
  ip_address TEXT,
  firmware_version TEXT,
  online INTEGER DEFAULT 0,
  last_seen INTEGER,
  config TEXT DEFAULT '{}',
  state TEXT DEFAULT '{}',
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 设备状态历史
CREATE TABLE IF NOT EXISTS device_states (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT NOT NULL,
  state TEXT NOT NULL,
  timestamp INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

-- 设备命令表 (用于下发指令)
CREATE TABLE IF NOT EXISTS device_commands (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  command TEXT NOT NULL,
  params TEXT DEFAULT '{}',
  timestamp INTEGER DEFAULT (unixepoch()),
  status TEXT DEFAULT 'pending',
  executed_at INTEGER,
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

-- 场景表
CREATE TABLE IF NOT EXISTS scenes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '🎬',
  enabled INTEGER DEFAULT 1,
  trigger_config TEXT NOT NULL,
  actions TEXT NOT NULL,
  last_triggered INTEGER,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 场景执行日志
CREATE TABLE IF NOT EXISTS scene_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scene_id TEXT NOT NULL,
  status TEXT NOT NULL,
  details TEXT,
  executed_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE CASCADE
);

-- 设备授权表 (用于分享设备)
CREATE TABLE IF NOT EXISTS device_shares (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  shared_with TEXT NOT NULL,
  permission TEXT DEFAULT 'control',
  expires_at INTEGER,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
  FOREIGN KEY (shared_with) REFERENCES users(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_devices_user ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_device_states_device ON device_states(device_id);
CREATE INDEX IF NOT EXISTS idx_device_states_time ON device_states(timestamp);
CREATE INDEX IF NOT EXISTS idx_device_commands_device ON device_commands(device_id);
CREATE INDEX IF NOT EXISTS idx_device_commands_status ON device_commands(status);
CREATE INDEX IF NOT EXISTS idx_scenes_user ON scenes(user_id);
CREATE INDEX IF NOT EXISTS idx_scene_logs_scene ON scene_logs(scene_id);

-- 刷新令牌表
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);
