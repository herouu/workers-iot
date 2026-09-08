// 入口：启动所有服务
import { config } from './config';
import { initDatabase } from './db/index';
import { startCleanupScheduler } from './db/cleanup';
import { startHttpServer } from './server/http';
import { startMqttServer, stopMqttServer } from './server/mqtt';
import { cloudSync } from './services/cloud-sync';
import { startMdnsService, stopMdnsService } from './services/mdns';

async function main() {
  console.log('========================================');
  console.log('  CloudIoT Local Gateway');
  console.log(`  Gateway ID: ${config.gatewayId}`);
  console.log('========================================');

  // 1. 初始化数据库
  initDatabase();
  console.log('[db] initialized');

  // 2. 启动定时清理
  startCleanupScheduler();
  console.log('[cleanup] scheduler started');

  // 3. 启动 HTTP Server
  startHttpServer();

  // 4. 启动 MQTT Broker
  try {
    await startMqttServer();
  } catch (err: any) {
    console.error(`[MQTT] failed to start: ${err.message}`);
  }

  // 5. 启动 mDNS 服务发现
  startMdnsService(config.httpPort, config.mqttPort);

  // 6. 启动云同步
  if (config.cloudApi && config.cloudKey) {
    cloudSync.startScheduler();
    console.log(`[sync] cloud sync started (${config.syncInterval / 1000}s interval)`);
  } else {
    console.log('[sync] cloud sync disabled (no API key)');
  }

  console.log('========================================');
  console.log('  Gateway ready');
  console.log(`  HTTP:  http://0.0.0.0:${config.httpPort}`);
  console.log(`  MQTT:  mqtt://0.0.0.0:${config.mqttPort}`);
  console.log('========================================');
}

// 优雅关闭
async function shutdown(signal: string) {
  console.log(`\n[shutdown] received ${signal}`);

  // 停止 mDNS
  stopMdnsService();

  // 停止 MQTT
  await stopMqttServer();

  console.log('[shutdown] complete');
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// 未捕获异常
process.on('uncaughtException', (err) => {
  console.error('[fatal] uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[fatal] unhandled rejection:', reason);
});

// 启动
main().catch((err) => {
  console.error('[fatal] failed to start gateway:', err);
  process.exit(1);
});
