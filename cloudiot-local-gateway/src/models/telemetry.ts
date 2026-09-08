// 遥测数据模型
import { db } from '../db/index';

export interface Telemetry {
  id: number;
  device_id: string;
  data: string;
  source: string;
  timestamp: number;
  synced: number;
}

export interface NewTelemetry {
  device_id: string;
  data: Record<string, unknown>;
  source?: string;
  timestamp?: number;
}

export const telemetryModel = {
  // 插入遥测
  insert(tel: NewTelemetry): number {
    const ts = tel.timestamp || Math.floor(Date.now() / 1000);
    const result = db.prepare(`
      INSERT INTO telemetry (device_id, data, source, timestamp)
      VALUES (?, ?, ?, ?)
    `).run(
      tel.device_id,
      JSON.stringify(tel.data),
      tel.source || 'http',
      ts
    );
    return result.lastInsertRowid as number;
  },

  // 批量插入
  batchInsert(items: NewTelemetry[]): void {
    const stmt = db.prepare(`
      INSERT INTO telemetry (device_id, data, source, timestamp)
      VALUES (?, ?, ?, ?)
    `);
    const txn = db.transaction((items: NewTelemetry[]) => {
      for (const item of items) {
        stmt.run(
          item.device_id,
          JSON.stringify(item.data),
          item.source || 'http',
          item.timestamp || Math.floor(Date.now() / 1000)
        );
      }
    });
    txn(items);
  },

  // 查询设备遥测
  findByDevice(deviceId: string, limit = 100, offset = 0): Telemetry[] {
    return db.prepare(
      'SELECT * FROM telemetry WHERE device_id = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?'
    ).all(deviceId, limit, offset) as Telemetry[];
  },

  // 查询未同步
  findUnsynced(limit = 100): Telemetry[] {
    return db.prepare(
      'SELECT * FROM telemetry WHERE synced = 0 ORDER BY timestamp ASC LIMIT ?'
    ).all(limit) as Telemetry[];
  },

  // 标记已同步
  markSynced(ids: number[]): void {
    if (ids.length === 0) return;
    const placeholders = ids.map(() => '?').join(',');
    db.prepare(`UPDATE telemetry SET synced = 1 WHERE id IN (${placeholders})`).run(...ids);
  },

  // 查询所有（分页）
  findAll(limit = 100, offset = 0): Telemetry[] {
    return db.prepare(
      'SELECT * FROM telemetry ORDER BY timestamp DESC LIMIT ? OFFSET ?'
    ).all(limit, offset) as Telemetry[];
  },

  // 统计
  count(): number {
    return (db.prepare('SELECT COUNT(*) as count FROM telemetry').get() as { count: number }).count;
  },

  // 按设备统计
  countByDevice(deviceId: string): number {
    return (db.prepare('SELECT COUNT(*) as count FROM telemetry WHERE device_id = ?').get(deviceId) as { count: number }).count;
  },
};
