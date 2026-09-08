// 规则模型
import { db } from '../db/index';

export interface RuleCondition {
  type: 'threshold' | 'state_change' | 'time';
  sensor: string;
  operator: '>' | '<' | '>=' | '<=' | '==';
  value: number | string;
}

export interface RuleAction {
  type: 'command' | 'http' | 'log';
  targetDevice?: string;
  command?: string;
  params?: Record<string, unknown>;
  url?: string;
  payload?: unknown;
}

export interface Rule {
  id: string;
  name: string;
  enabled: number;
  condition: string;
  action: string;
  created_at: number;
}

export interface NewRule {
  id?: string;
  name: string;
  enabled?: boolean;
  condition: RuleCondition;
  action: RuleAction;
}

function generateId(): string {
  const crypto = require('crypto');
  return `rule-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

export const ruleModel = {
  // 创建规则
  create(rule: NewRule): Rule {
    const id = rule.id || generateId();
    const now = Math.floor(Date.now() / 1000);

    db.prepare(`
      INSERT INTO rules (id, name, enabled, condition, action, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      rule.name,
      rule.enabled !== false ? 1 : 0,
      JSON.stringify(rule.condition),
      JSON.stringify(rule.action),
      now
    );

    return this.findById(id)!;
  },

  // 查找
  findById(id: string): Rule | undefined {
    return db.prepare('SELECT * FROM rules WHERE id = ?').get(id) as Rule | undefined;
  },

  // 查找所有
  findAll(): Rule[] {
    return db.prepare('SELECT * FROM rules ORDER BY created_at DESC').all() as Rule[];
  },

  // 查找启用的
  findEnabled(): Rule[] {
    return db.prepare('SELECT * FROM rules WHERE enabled = 1').all() as Rule[];
  },

  // 更新
  update(id: string, updates: Partial<NewRule>): void {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.enabled !== undefined) { fields.push('enabled = ?'); values.push(updates.enabled ? 1 : 0); }
    if (updates.condition !== undefined) { fields.push('condition = ?'); values.push(JSON.stringify(updates.condition)); }
    if (updates.action !== undefined) { fields.push('action = ?'); values.push(JSON.stringify(updates.action)); }

    if (fields.length === 0) return;
    values.push(id);
    db.prepare(`UPDATE rules SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  },

  // 删除
  delete(id: string): void {
    db.prepare('DELETE FROM rules WHERE id = ?').run(id);
  },

  // 切换启用
  toggle(id: string): void {
    db.prepare('UPDATE rules SET enabled = CASE WHEN enabled = 1 THEN 0 ELSE 1 END WHERE id = ?').run(id);
  },
};
