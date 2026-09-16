-- 设备协议字段（用于网关云同步上报 protocol）
-- 说明：001 初始 schema 未包含 protocol，网关 /api/devices/sync 需要该列
ALTER TABLE devices ADD COLUMN protocol TEXT DEFAULT 'http';
