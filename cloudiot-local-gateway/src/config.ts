// 配置管理
export const config = {
  httpPort: parseInt(process.env.HTTP_PORT || '8080'),
  mqttPort: parseInt(process.env.MQTT_PORT || '1883'),
  dbPath: process.env.DB_PATH || './data/gateway.db',
  cloudApi: process.env.CLOUD_API || 'https://your-worker.workers.dev',
  cloudKey: process.env.CLOUD_KEY || '',
  syncInterval: parseInt(process.env.SYNC_INTERVAL || '30') * 1000, // 毫秒
  dataRetentionDays: parseInt(process.env.DATA_RETENTION_DAYS || '180'),
  deviceAutoRegister: process.env.DEVICE_AUTO_REGISTER !== 'false',
  logLevel: process.env.LOG_LEVEL || 'info',
  gatewayId: process.env.GATEWAY_ID || `gateway-${Date.now()}`,
};
