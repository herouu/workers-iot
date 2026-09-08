// 管理路由
import { Hono } from 'hono';
import { config } from '../config';
import { deviceModel } from '../models/device';
import { commandModel } from '../models/command';
import { telemetryModel } from '../models/telemetry';
import { ruleModel } from '../models/rule';
import { cloudSync } from '../services/cloud-sync';
import { cleanupAll } from '../db/cleanup';

export const adminRoutes = new Hono();

// 网关状态
adminRoutes.get('/status', (c) => {
  const devices = deviceModel.findAll();
  const online = devices.filter(d => d.online === 1);

  return c.json({
    gateway_id: config.gatewayId,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    devices: {
      total: devices.length,
      online: online.length,
      offline: devices.length - online.length,
    },
    commands: commandModel.countByStatus(),
    telemetry: {
      total: telemetryModel.count(),
      unsynced: telemetryModel.findUnsynced(1000).length,
    },
    rules: {
      total: ruleModel.findAll().length,
      enabled: ruleModel.findEnabled().length,
    },
    config: {
      cloud_api: config.cloudApi,
      sync_interval: config.syncInterval / 1000,
      data_retention_days: config.dataRetentionDays,
      auto_register: config.deviceAutoRegister,
    },
  });
});

// 触发云同步
adminRoutes.post('/sync', async (c) => {
  const result = await cloudSync.sync();
  return c.json(result);
});

// 手动清理数据
adminRoutes.post('/cleanup', (c) => {
  const result = cleanupAll();
  return c.json({ success: true, cleaned: result });
});

// 获取网关配置
adminRoutes.get('/config', (c) => {
  return c.json({
    gateway_id: config.gatewayId,
    http_port: config.httpPort,
    mqtt_port: config.mqttPort,
    cloud_api: config.cloudApi ? '***configured***' : 'not set',
    cloud_key: config.cloudKey ? '***configured***' : 'not set',
    sync_interval: config.syncInterval / 1000,
    data_retention_days: config.dataRetentionDays,
    auto_register: config.deviceAutoRegister,
  });
});

// 更新网关配置
adminRoutes.put('/config', async (c) => {
  const body = await c.req.json();

  // 更新运行时配置（重启后丢失，持久化需写入 DB）
  if (body.cloud_key) config.cloudKey = body.cloud_key;
  if (body.cloud_api) config.cloudApi = body.cloud_api;
  if (body.sync_interval) config.syncInterval = body.sync_interval * 1000;

  return c.json({ success: true });
});

// 重启网关
adminRoutes.post('/restart', (c) => {
  console.log('[admin] restart requested');
  setTimeout(() => process.exit(0), 1000);
  return c.json({ success: true, message: 'Gateway restarting...' });
});
