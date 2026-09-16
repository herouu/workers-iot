// 配置管理
import os from 'os';

export const config = {
  httpPort: parseInt(process.env.HTTP_PORT || '8080'),
  mqttPort: parseInt(process.env.MQTT_PORT || '1883'),
  dbPath: process.env.DB_PATH || './data/gateway.db',
  cloudApi: process.env.CLOUD_API || '',
  cloudKey: process.env.CLOUD_KEY || '',
  syncInterval: parseInt(process.env.SYNC_INTERVAL || '30') * 1000, // 毫秒
  dataRetentionDays: parseInt(process.env.DATA_RETENTION_DAYS || '180'),
  deviceAutoRegister: process.env.DEVICE_AUTO_REGISTER !== 'false',
  logLevel: process.env.LOG_LEVEL || 'info',
  // 默认按主机名生成，冷启动保持稳定（旧版 Date.now() 每次重启漂移）
  gatewayId: process.env.GATEWAY_ID || `gateway-${os.hostname()}`,
};
