// 设备模型
import { db } from '../db/index';

export interface Device {
  id: string;
  name: string | null;
  type: string;
  mac_address: string | null;
  secret_hash: string | null;
  salt: string | null;
  online: number;
  protocol: string;
  last_seen: number | null;
  config: string | null;
  created_at: number;
}

export interface NewDevice {
  id: string;
  name?: string;
  type?: string;
  mac_address?: string;
  secret?: string;
  protocol?: string;
  config?: Record<string, unknown>;
}

function hashSecret(secret: string, salt: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(secret + salt).digest('hex');
}

function generateSalt(): string {
  const crypto = require('crypto');
  return crypto.randomBytes(16).toString('hex');
}

export const deviceModel = {
  // 查找设备
  findById(id: string): Device | undefined {
    return db.prepare('SELECT * FROM devices WHERE id = ?').get(id) as Device | undefined;
  },

  // 查找所有
  findAll(): Device[] {
    return db.prepare('SELECT * FROM devices ORDER BY created_at DESC').all() as Device[];
  },

  // 查找在线设备
  findOnline(): Device[] {
    return db.prepare('SELECT * FROM devices WHERE online = 1').all() as Device[];
  },

  // 创建设备
  create(dev: NewDevice): Device {
    const salt = generateSalt();
    const secretHash = dev.secret ? hashSecret(dev.secret, salt) : null;
    const now = Math.floor(Date.now() / 1000);

    db.prepare(`
      INSERT INTO devices (id, name, type, mac_address, secret_hash, salt, protocol, config, online, last_seen, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      dev.id,
      dev.name || dev.id,
      dev.type || 'unknown',
      dev.mac_address || null,
      secretHash,
      salt,
      dev.protocol || 'http',
      dev.config ? JSON.stringify(dev.config) : null,
      now,
      now
    );

    return this.findById(dev.id)!;
  },

  // 自动注册或更新
  autoRegister(id: string, protocol: string, data?: Record<string, unknown>): Device {
    const existing = this.findById(id);
    if (existing) {
      this.updateOnline(id, protocol);
      return this.findById(id)!;
    }

    return this.create({
      id,
      name: id,
      type: data?.type as string || 'unknown',
      protocol,
      config: data,
    });
  },

  // 更新在线状态
  updateOnline(id: string, protocol?: string): void {
    const now = Math.floor(Date.now() / 1000);
    if (protocol) {
      db.prepare('UPDATE devices SET online = 1, last_seen = ?, protocol = ? WHERE id = ?')
        .run(now, protocol, id);
    } else {
      db.prepare('UPDATE devices SET online = 1, last_seen = ? WHERE id = ?')
        .run(now, id);
    }
  },

  // 设置离线
  setOffline(id: string): void {
    db.prepare('UPDATE devices SET online = 0 WHERE id = ?').run(id);
  },

  // 验证密钥
  verifySecret(id: string, secret: string): boolean {
    const device = this.findById(id);
    if (!device || !device.secret_hash || !device.salt) return false;
    const hash = hashSecret(secret, device.salt);
    return hash === device.secret_hash;
  },

  // 更新设备
  update(id: string, updates: Partial<NewDevice>): void {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.type !== undefined) { fields.push('type = ?'); values.push(updates.type); }
    if (updates.config !== undefined) { fields.push('config = ?'); values.push(JSON.stringify(updates.config)); }

    if (fields.length === 0) return;
    values.push(id);
    db.prepare(`UPDATE devices SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  },

  // 删除设备
  delete(id: string): void {
    db.prepare('DELETE FROM devices WHERE id = ?').run(id);
  },
};
