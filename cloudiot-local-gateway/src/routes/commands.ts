// 命令路由
import { Hono } from 'hono';
import { commandModel } from '../models/command';
import { deviceModel } from '../models/device';

export const commandRoutes = new Hono();

// 设备轮询取命令（HTTP 模式）
commandRoutes.get('/:deviceId', (c) => {
  const deviceId = c.req.param('deviceId');

  const device = deviceModel.findById(deviceId);
  if (!device) return c.json({ error: 'Device not found' }, 404);

  const commands = commandModel.findPending(deviceId);

  // 标记为已发送
  for (const cmd of commands) {
    commandModel.markSent(cmd.id);
  }

  return c.json({
    commands: commands.map(cmd => ({
      id: cmd.id,
      command: cmd.command,
      params: cmd.params ? JSON.parse(cmd.params) : undefined,
    })),
  });
});

// 命令 ACK
commandRoutes.post('/:deviceId/ack', async (c) => {
  const deviceId = c.req.param('deviceId');
  const body = await c.req.json();

  if (!body.command_id) return c.json({ error: 'command_id is required' }, 400);

  const { commandDispatcher } = require('../services/command-dispatcher');
  commandDispatcher.handleAck(deviceId, body.command_id, body.success !== false);

  return c.json({ success: true });
});

// 查询命令列表
commandRoutes.get('/', (c) => {
  const limit = parseInt(c.req.query('limit') || '50');
  const deviceId = c.req.query('device_id');

  if (deviceId) {
    const commands = commandModel.findByDevice(deviceId, limit);
    return c.json({ commands, total: commands.length });
  }

  const pending = commandModel.findAllPending();
  const stats = commandModel.countByStatus();
  return c.json({ pending, stats, total: pending.length });
});
