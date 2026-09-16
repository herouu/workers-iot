-- 设备鉴权字段（device_id+secret 换 JWT 用）
ALTER TABLE devices ADD COLUMN secret_hash TEXT;
ALTER TABLE devices ADD COLUMN secret_salt TEXT;

-- 命令回执字段（ACK 时间戳，状态机 pending → sent → acked/failed）
ALTER TABLE device_commands ADD COLUMN acked_at INTEGER;
