// 规则路由
import { Hono } from 'hono';
import { ruleModel } from '../models/rule';

export const ruleRoutes = new Hono();

// 获取规则列表
ruleRoutes.get('/', (c) => {
  const rules = ruleModel.findAll();
  return c.json({
    rules: rules.map(r => ({
      ...r,
      condition: JSON.parse(r.condition),
      action: JSON.parse(r.action),
    })),
    total: rules.length,
  });
});

// 创建规则
ruleRoutes.post('/', async (c) => {
  const body = await c.req.json();

  if (!body.name) return c.json({ error: 'name is required' }, 400);
  if (!body.condition) return c.json({ error: 'condition is required' }, 400);
  if (!body.action) return c.json({ error: 'action is required' }, 400);

  const rule = ruleModel.create({
    name: body.name,
    enabled: body.enabled,
    condition: body.condition,
    action: body.action,
  });

  return c.json({
    rule: {
      ...rule,
      condition: JSON.parse(rule.condition),
      action: JSON.parse(rule.action),
    },
  }, 201);
});

// 更新规则
ruleRoutes.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();

  const rule = ruleModel.findById(id);
  if (!rule) return c.json({ error: 'Rule not found' }, 404);

  ruleModel.update(id, {
    name: body.name,
    enabled: body.enabled,
    condition: body.condition,
    action: body.action,
  });

  const updated = ruleModel.findById(id)!;
  return c.json({
    rule: {
      ...updated,
      condition: JSON.parse(updated.condition),
      action: JSON.parse(updated.action),
    },
  });
});

// 切换规则启用
ruleRoutes.post('/:id/toggle', (c) => {
  const id = c.req.param('id');
  const rule = ruleModel.findById(id);
  if (!rule) return c.json({ error: 'Rule not found' }, 404);

  ruleModel.toggle(id);
  const updated = ruleModel.findById(id)!;
  return c.json({ rule: updated });
});

// 删除规则
ruleRoutes.delete('/:id', (c) => {
  const id = c.req.param('id');
  const rule = ruleModel.findById(id);
  if (!rule) return c.json({ error: 'Rule not found' }, 404);

  ruleModel.delete(id);
  return c.json({ success: true });
});
