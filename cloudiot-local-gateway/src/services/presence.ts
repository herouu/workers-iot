// 设备存在性（心跳）扫描服务
// MQTT 通道断连时由 broker 的 clientDisconnect 事件判离线；
// HTTP 通道没有长连接，只能靠 last_seen 超时扫描判离线。
import { config } from '../config';
import { db } from '../db/index';
import { deviceModel } from '../models/device';

interface StaleDevice {
  id: string;
  last_seen: number | null;
}

// 单次扫描：找出 protocol='http' 且在线、但超过 TTL 无心跳的设备，逐个置为离线
// 返回本次判定离线的设备 ID 列表
export function scanStaleHttpDevices(ttlMs: number): string[] {
  // last_seen 存的是秒级时间戳，TTL 配置是毫秒
  const cutoff = Math.floor((Date.now() - ttlMs) / 1000);
  const now = Math.floor(Date.now() / 1000);

  // last_seen 为 NULL 的设备同样视为过期（从未上报过心跳）
  const stale = db.prepare(`
    SELECT id, last_seen FROM devices
    WHERE protocol = 'http' AND online = 1 AND (last_seen IS NULL OR last_seen < ?)
  `).all(cutoff) as StaleDevice[];

  const offlined: string[] = [];
  for (const dev of stale) {
    deviceModel.setOffline(dev.id);
    offlined.push(dev.id);

    if (dev.last_seen === null) {
      console.log(`[presence] 设备心跳超时下线: ${dev.id} (无上报记录, TTL=${Math.round(ttlMs / 1000)}s)`);
    } else {
      const silentSec = now - dev.last_seen;
      console.log(`[presence] 设备心跳超时下线: ${dev.id} (静默 ${silentSec}s, TTL=${Math.round(ttlMs / 1000)}s)`);
    }
  }

  return offlined;
}

// 启动定时心跳扫描，返回定时器句柄（可用于 clearInterval）
export function startStaleScan(
  ttlMs: number = config.presenceStaleTtl,
  intervalMs: number = config.presenceScanInterval
): NodeJS.Timeout {
  const run = () => {
    try {
      scanStaleHttpDevices(ttlMs);
    } catch (err: any) {
      console.error(`[presence] scan error: ${err.message}`);
    }
  };

  console.log(
    `[presence] 心跳扫描已启动 (TTL=${ttlMs}ms, 间隔=${intervalMs}ms)`
  );

  // 立即执行一次，避免启动后要等一个扫描周期
  run();

  const interval = setInterval(run, intervalMs);
  return interval;
}
