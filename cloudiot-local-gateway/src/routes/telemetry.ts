// 遥测路由
import { Hono } from 'hono';
import { telemetryModel } from '../models/telemetry';
import { deviceModel } from '../models/device';
import { ruleEngine } from '../services/rule-engine';
import { config } from '../config';

export const telemetryRoutes = new Hono();

// 接收遥测（设备上报）
telemetryRoutes.post('/', async (c) => {
  const body = await c.req.json();

  if (!body.device_id) return c.json({ error: 'device_id is required' }, 400);

  // 自动注册
  if (config.deviceAutoRegister && !deviceModel.findById(body.device_id)) {
    deviceModel.autoRegister(body.device_id, 'http', body.data);
  }

  // 更新在线状态
  deviceModel.updateOnline(body.device_id, 'http');

  // 存储遥测
  const id = telemetryModel.insert({
    device_id: body.device_id,
    data: body.data || body,
    source: 'http',
    timestamp: body.timestamp,
  });

  // 触发规则引擎
  ruleEngine.evaluate({
    device_id: body.device_id,
    data: body.data || body,
    timestamp: body.timestamp || Math.floor(Date.now() / 1000),
  });

  return c.json({ success: true, id }, 201);
});

// 批量接收
telemetryRoutes.post('/batch', async (c) => {
  const body = await c.req.json();

  if (!body.data || !Array.isArray(body.data)) {
    return c.json({ error: 'data array is required' }, 400);
  }

  let count = 0;
  for (const item of body.data) {
    const deviceId = item.device_id;
    if (!deviceId) continue;

    // 自动注册
    if (config.deviceAutoRegister && !deviceModel.findById(deviceId)) {
      deviceModel.autoRegister(deviceId, 'http', item.data);
    }

    deviceModel.updateOnline(deviceId, 'http');
    telemetryModel.insert({
      device_id: deviceId,
      data: item.data || item,
      source: 'http',
      timestamp: item.timestamp,
    });

    ruleEngine.evaluate({
      device_id: deviceId,
      data: item.data || item,
      timestamp: item.timestamp || Math.floor(Date.now() / 1000),
    });

    count++;
  }

  return c.json({ success: true, count });
});

// 查询遥测
telemetryRoutes.get('/', (c) => {
  const limit = parseInt(c.req.query('limit') || '100');
  const offset = parseInt(c.req.query('offset') || '0');
  const data = telemetryModel.findAll(limit, offset);
  const total = telemetryModel.count();
  return c.json({ data, total, limit, offset });
});

// 查询设备遥测
telemetryRoutes.get('/:deviceId', (c) => {
  const deviceId = c.req.param('deviceId');
  const limit = parseInt(c.req.query('limit') || '100');
  const offset = parseInt(c.req.query('offset') || '0');

  const data = telemetryModel.findByDevice(deviceId, limit, offset);
  const total = telemetryModel.countByDevice(deviceId);
  return c.json({ data, total, limit, offset });
});
