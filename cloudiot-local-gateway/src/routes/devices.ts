// 设备路由
import { Hono } from 'hono';
import { deviceModel } from '../models/device';
import { commandModel } from '../models/command';
import { config } from '../config';

export const deviceRoutes = new Hono();

// 获取设备列表
deviceRoutes.get('/', (c) => {
  const devices = deviceModel.findAll();
  return c.json({ devices, total: devices.length });
});

// 获取在线设备
deviceRoutes.get('/online', (c) => {
  const devices = deviceModel.findOnline();
  return c.json({ devices, total: devices.length });
});

// 获取设备详情
deviceRoutes.get('/:id', (c) => {
  const id = c.req.param('id');
  const device = deviceModel.findById(id);
  if (!device) return c.json({ error: 'Device not found' }, 404);

  const pendingCommands = commandModel.findPending(id);
  const stats = {
    telemetry_count: 0, // 可由 telemetryModel 统计
    command_count: commandModel.countByStatus(),
  };

  return c.json({ device, pending_commands: pendingCommands.length, stats });
});

// 注册设备
deviceRoutes.post('/', async (c) => {
  const body = await c.req.json();

  if (!body.id) return c.json({ error: 'id is required' }, 400);

  const existing = deviceModel.findById(body.id);
  if (existing) return c.json({ error: 'Device already exists' }, 409);

  const device = deviceModel.create({
    id: body.id,
    name: body.name,
    type: body.type,
    mac_address: body.mac_address,
    secret: body.secret,
    protocol: body.protocol,
    config: body.config,
  });

  return c.json({ device }, 201);
});

// 更新设备
deviceRoutes.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();

  const device = deviceModel.findById(id);
  if (!device) return c.json({ error: 'Device not found' }, 404);

  deviceModel.update(id, {
    name: body.name,
    type: body.type,
    config: body.config,
  });

  return c.json({ device: deviceModel.findById(id) });
});

// 删除设备
deviceRoutes.delete('/:id', (c) => {
  const id = c.req.param('id');
  const device = deviceModel.findById(id);
  if (!device) return c.json({ error: 'Device not found' }, 404);

  deviceModel.delete(id);
  return c.json({ success: true });
});

// 下发命令
deviceRoutes.post('/:id/command', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();

  if (!body.command) return c.json({ error: 'command is required' }, 400);

  const device = deviceModel.findById(id);
  if (!device) return c.json({ error: 'Device not found' }, 404);

  // 由 command-dispatcher 处理
  const { commandDispatcher } = require('../services/command-dispatcher');
  commandDispatcher.insert({
    device_id: id,
    command: body.command,
    params: body.params,
    source: 'http',
  });

  return c.json({ success: true, message: 'Command queued' });
});
