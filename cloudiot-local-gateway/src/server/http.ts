// Hono HTTP Server
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { config } from '../config';
import { deviceRoutes } from '../routes/devices';
import { telemetryRoutes } from '../routes/telemetry';
import { commandRoutes } from '../routes/commands';
import { ruleRoutes } from '../routes/rules';
import { adminRoutes } from '../routes/admin';

export function createHttpServer() {
  const app = new Hono();

  // CORS
  app.use('*', cors());

  // 健康检查
  app.get('/health', (c) => {
    return c.json({
      status: 'ok',
      gateway_id: config.gatewayId,
      uptime: process.uptime(),
      timestamp: Math.floor(Date.now() / 1000),
    });
  });

  // API 路由
  app.route('/api/devices', deviceRoutes);
  app.route('/api/telemetry', telemetryRoutes);
  app.route('/api/commands', commandRoutes);
  app.route('/api/rules', ruleRoutes);
  app.route('/api/admin', adminRoutes);

  // 根路径
  app.get('/', (c) => {
    return c.json({
      name: 'CloudIoT Local Gateway',
      version: '1.0.0',
      gateway_id: config.gatewayId,
      endpoints: {
        health: '/health',
        devices: '/api/devices',
        telemetry: '/api/telemetry',
        commands: '/api/commands',
        rules: '/api/rules',
        admin: '/api/admin',
      },
    });
  });

  return app;
}

export function startHttpServer() {
  const app = createHttpServer();

  // Bun/Node 兼容启动
  const port = config.httpPort;

  // 使用 Bun.serve 或 Node http
  if (typeof Bun !== 'undefined') {
    Bun.serve({
      port,
      fetch: app.fetch,
    });
  } else {
    // Node.js 模式
    import('hono/node-server').then(({ serve }) => {
      serve({ fetch: app.fetch, port });
    });
  }

  console.log(`[HTTP] server started on port ${port}`);
  return app;
}
