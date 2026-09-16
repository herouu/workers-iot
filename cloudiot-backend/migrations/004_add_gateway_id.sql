-- 设备归属网关字段（用于 cloud-sync 命令按网关过滤下发）
-- 说明：devices.gateway_id 表示该设备由哪个本地网关托管；
-- 云端 /api/commands/pending 据此只下发本网关设备命令，避免多网关互抢。
ALTER TABLE devices ADD COLUMN gateway_id TEXT;

CREATE INDEX IF NOT EXISTS idx_devices_gateway ON devices(gateway_id);