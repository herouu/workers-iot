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
  // HTTP 设备无心跳判离线阈值（毫秒），默认 120000 = 2 分钟无上报即下线
  presenceStaleTtl: parseInt(process.env.DEVICE_HTTP_STALE_TTL_MS || '120000'),
  // 心跳扫描周期（毫秒），默认 30000 = 每 30 秒扫描一次
  presenceScanInterval: parseInt(process.env.DEVICE_HTTP_STALE_SCAN_INTERVAL_MS || '30000'),
  logLevel: process.env.LOG_LEVEL || 'info',
  // 默认按主机名生成，冷启动保持稳定（旧版 Date.now() 每次重启漂移）
  gatewayId: process.env.GATEWAY_ID || `gateway-${os.hostname()}`,

  // ===== DNS-SD / mDNS 服务发现配置 =====
  // 是否启用 mDNS 服务广播
  mdnsEnabled: process.env.MDNS_ENABLED !== 'false',
  // mDNS 服务名前缀（最终显示为 "IoT Gateway (<gatewayId>)"）
  mdnsServiceName: process.env.MDNS_SERVICE_NAME || 'IoT Gateway',
  // 网络接口名绑定（如 wlan0/eth0），留空则自动选取第一个非回环接口
  mdnsInterface: process.env.MDNS_INTERFACE || '',
  // DNS-SD TXT 服务类型标识（客户端按此过滤）
  mdnsServiceType: process.env.MDNS_SERVICE_TYPE || 'iot-gateway',
  // 是否同时广播 MQTT 独立服务 (_mqtt._tcp)
  mdnsAdvertiseMqtt: process.env.MDNS_ADVERTISE_MQTT !== 'false',
};
