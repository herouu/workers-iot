// 数据清理服务
import { db } from './index';
import { config } from '../config';

// 清理过期遥测数据
export function cleanupTelemetry() {
  const cutoff = Math.floor(Date.now() / 1000) - (config.dataRetentionDays * 86400);
  const result = db.prepare(
    'DELETE FROM telemetry WHERE timestamp < ?'
  ).run(cutoff);
  return result.changes;
}

// 清理已同步的遥测（7天后）
export function cleanupSyncedTelemetry() {
  const cutoff = Math.floor(Date.now() / 1000) - (7 * 86400);
  const result = db.prepare(
    'DELETE FROM telemetry WHERE synced = 1 AND timestamp < ?'
  ).run(cutoff);
  return result.changes;
}

// 清理已完成命令（30天后）
export function cleanupCommands() {
  const cutoff = Math.floor(Date.now() / 1000) - (30 * 86400);
  const result = db.prepare(
    `DELETE FROM commands WHERE status IN ('acked','failed','expired') AND created_at < ?`
  ).run(cutoff);
  return result.changes;
}

// 执行所有清理
export function cleanupAll() {
  const telemetry = cleanupTelemetry();
  const synced = cleanupSyncedTelemetry();
  const commands = cleanupCommands();
  return { telemetry, synced, commands };
}

// 启动定时清理（每天凌晨3点）
export function startCleanupScheduler() {
  const run = () => {
    const result = cleanupAll();
    if (result.telemetry > 0 || result.synced > 0 || result.commands > 0) {
      console.log(`[cleanup] telemetry=${result.telemetry}, synced=${result.synced}, commands=${result.commands}`);
    }
  };

  // 立即执行一次
  run();

  // 每小时检查是否到了凌晨3点
  const interval = setInterval(() => {
    const now = new Date();
    if (now.getHours() === 3 && now.getMinutes() === 0) {
      run();
    }
  }, 60000);

  return interval;
}
