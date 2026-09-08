// 命令模型
import { db } from '../db/index';

export interface Command {
  id: string;
  device_id: string;
  command: string;
  params: string | null;
  status: string;
  source: string;
  created_at: number;
  sent_at: number | null;
  acked_at: number | null;
}

export interface NewCommand {
  device_id: string;
  command: string;
  params?: Record<string, unknown>;
  source?: string;
}

function generateId(): string {
  const crypto = require('crypto');
  return `cmd-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

export const commandModel = {
  // 插入命令
  insert(cmd: NewCommand): Command {
    const id = generateId();
    const now = Math.floor(Date.now() / 1000);

    db.prepare(`
      INSERT INTO commands (id, device_id, command, params, status, source, created_at)
      VALUES (?, ?, ?, ?, 'pending', ?, ?)
    `).run(
      id,
      cmd.device_id,
      cmd.command,
      cmd.params ? JSON.stringify(cmd.params) : null,
      cmd.source || 'http',
      now
    );

    return this.findById(id)!;
  },

  // 查找
  findById(id: string): Command | undefined {
    return db.prepare('SELECT * FROM commands WHERE id = ?').get(id) as Command | undefined;
  },

  // 查询设备 pending 命令
  findPending(deviceId: string): Command[] {
    return db.prepare(
      "SELECT * FROM commands WHERE device_id = ? AND status = 'pending' ORDER BY created_at ASC"
    ).all(deviceId) as Command[];
  },

  // 查询设备所有命令
  findByDevice(deviceId: string, limit = 50): Command[] {
    return db.prepare(
      'SELECT * FROM commands WHERE device_id = ? ORDER BY created_at DESC LIMIT ?'
    ).all(deviceId, limit) as Command[];
  },

  // 标记已发送
  markSent(id: string): void {
    db.prepare("UPDATE commands SET status = 'sent', sent_at = ? WHERE id = ?")
      .run(Math.floor(Date.now() / 1000), id);
  },

  // 标记已确认
  markAcked(id: string): void {
    db.prepare("UPDATE commands SET status = 'acked', acked_at = ? WHERE id = ?")
      .run(Math.floor(Date.now() / 1000), id);
  },

  // 标记失败
  markFailed(id: string): void {
    db.prepare("UPDATE commands SET status = 'failed' WHERE id = ?").run(id);
  },

  // 查询所有 pending
  findAllPending(): Command[] {
    return db.prepare(
      "SELECT * FROM commands WHERE status = 'pending' ORDER BY created_at ASC"
    ).all() as Command[];
  },

  // 统计
  count(): number {
    return (db.prepare('SELECT COUNT(*) as count FROM commands').get() as { count: number }).count;
  },

  // 按状态统计
  countByStatus(): Record<string, number> {
    const rows = db.prepare(
      'SELECT status, COUNT(*) as count FROM commands GROUP BY status'
    ).all() as Array<{ status: string; count: number }>;
    const result: Record<string, number> = {};
    for (const row of rows) {
      result[row.status] = row.count;
    }
    return result;
  },
};
