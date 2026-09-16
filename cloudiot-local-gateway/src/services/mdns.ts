// DNS-SD / mDNS 服务广播（RFC 6763 兼容）
import { config } from '../config';
import { networkInterfaces } from 'os';

let bonjourInstance: any = null;
let httpService: any = null;
let mqttService: any = null;

// 按配置绑定接口，否则取第一个非回环 IPv4
function getLocalIPv4(): string {
  const ifaces = networkInterfaces();
  const targetIface = config.mdnsInterface;

  for (const name of Object.keys(ifaces)) {
    // 若指定接口则只匹配该接口
    if (targetIface && name !== targetIface) continue;

    for (const info of ifaces[name] || []) {
      if (info.family === 'IPv4' && !info.internal && info.address !== '0.0.0.0' && info.address !== '127.0.0.1') {
        return info.address;
      }
    }
  }

  // 未找到指定接口或非指定模式：回退到第一个可用 IPv4
  if (targetIface) {
    console.warn(`[mDNS] interface "${targetIface}" not found, falling back`);
    for (const name of Object.keys(ifaces)) {
      for (const info of ifaces[name] || []) {
        if (info.family === 'IPv4' && !info.internal && info.address !== '0.0.0.0' && info.address !== '127.0.0.1') {
          return info.address;
        }
      }
    }
  }

  return '127.0.0.1';
}

/**
 * DNS-SD TXT 记录（RFC 6763 §6）
 * 所有键值对长度 <= 255 字节，总长 <= 1300 字节
 */
function buildTxtRecord(ip: string, mqttPort: number, isMqtt: boolean): Record<string, string> {
  const base: Record<string, string> = {
    type: config.mdnsServiceType,
    version: '1.0',
    gateway_id: config.gatewayId,
    hostname: require('os').hostname(),
    api: '/api/v1',
  };

  if (isMqtt) {
    // MQTT 独立服务 TXT
    base.proto = 'mqtt';
    base.port = String(mqttPort);
    base.url = `mqtt://${ip}:${mqttPort}`;
    base.transport = 'tcp';
  } else {
    // HTTP 主服务 TXT
    base.proto = 'http';
    base.port = String(config.httpPort);
    base.path = '/';
    base.mqtt_port = String(mqttPort);
    base.mqtt_url = `mqtt://${ip}:${mqttPort}`;
  }

  return base;
}

/**
 * 启动 DNS-SD 服务广播
 * 注册两个独立服务：_http._tcp 与 _mqtt._tcp（RFC 6763 推荐每种协议独立注册）
 */
export function startMdnsService(httpPort: number, mqttPort: number): void {
  if (!config.mdnsEnabled) {
    console.log('[mDNS] disabled via config');
    return;
  }

  try {
    const ip = getLocalIPv4();

    // multicast-dns 必须显式绑定接口，否则多网卡设备（典型：Termux 手机同时有
    // wlan0 + 蜂窝 rmnet）会走 defaultInterface() 发出组播，局域网根本收不到广播。
    // interface 选项语义（multicast-dns 7.x）：
    //   bind → 绑定 socket；addMembership → 该接口加入 224.0.0.251 组；
    //   setMulticastInterface → 指定组播出口网卡。
    const bonjourOpts = ip && ip !== '127.0.0.1' ? { interface: ip } : {};
    const bonjour = require('bonjour')(bonjourOpts);
    bonjourInstance = bonjour;
    if (bonjourOpts.interface) {
      console.log(`[mDNS] multicast socket bound to interface ${bonjourOpts.interface}`);
    } else {
      console.warn('[mDNS] no valid LAN IPv4 found; multicast will use default interface');
    }

    // 1. 广播 HTTP 主服务 (_http._tcp)
    httpService = bonjour.publish({
      name: `${config.mdnsServiceName} (${config.gatewayId})`,
      type: 'http',
      port: httpPort,
      txt: buildTxtRecord(ip, mqttPort, false),
    });

    httpService.on('up', () => {
      console.log(`[mDNS] HTTP service up: _http._tcp:${httpPort} @ ${ip}`);
    });

    httpService.on('error', (err: any) => {
      console.warn(`[mDNS] HTTP service error: ${err.message}`);
    });

    // 2. 广播 MQTT 独立服务 (_mqtt._tcp)
    if (config.mdnsAdvertiseMqtt) {
      mqttService = bonjour.publish({
        name: `${config.mdnsServiceName} MQTT (${config.gatewayId})`,
        type: 'mqtt',
        port: mqttPort,
        txt: buildTxtRecord(ip, mqttPort, true),
      });

      mqttService.on('up', () => {
        console.log(`[mDNS] MQTT service up: _mqtt._tcp:${mqttPort} @ ${ip}`);
      });

      mqttService.on('error', (err: any) => {
        console.warn(`[mDNS] MQTT service error: ${err.message}`);
      });
    }

    console.log(`[mDNS] DNS-SD services registered (addr=${ip}, iface=${config.mdnsInterface || 'auto'})`);
  } catch (err: any) {
    console.warn(`[mDNS] failed to start: ${err.message}`);
  }
}

/** 停止所有 DNS-SD 服务广播 */
export function stopMdnsService(): void {
  const services = [
    { svc: mqttService, label: 'MQTT' },
    { svc: httpService, label: 'HTTP' },
  ];

  for (const { svc, label } of services) {
    if (svc) {
      try {
        svc.stop();
        console.log(`[mDNS] ${label} service stopped`);
      } catch (err: any) {
        console.warn(`[mDNS] error stopping ${label}: ${err.message}`);
      }
    }
  }

  if (bonjourInstance) {
    bonjourInstance.destroy();
    bonjourInstance = null;
  }

  httpService = null;
  mqttService = null;
}

/** 获取当前广播状态（供 HTTP API 健康检查用） */
export function getMdnsStatus(): { enabled: boolean; httpUp: boolean; mqttUp: boolean; ip: string } {
  return {
    enabled: config.mdnsEnabled,
    httpUp: !!httpService,
    mqttUp: !!mqttService,
    ip: config.mdnsEnabled ? getLocalIPv4() : '127.0.0.1',
  };
}
