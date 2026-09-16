// mDNS 服务发现
import { config } from '../config';
import { networkInterfaces } from 'os';

let bonjour: any = null;
let bonjourService: any = null;

// 取第一个非回环 IPv4（Termux 手机常见 wlan0/eth0）
function getLocalIPv4(): string {
  const ifaces = networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const info of ifaces[name] || []) {
      if (info.family === 'IPv4' && !info.internal && info.address !== '0.0.0.0' && info.address !== '127.0.0.1') {
        return info.address;
      }
    }
  }
  return '127.0.0.1';
}

export function startMdnsService(httpPort: number, mqttPort: number) {
  try {
    bonjour = require('bonjour')();
    const ip = getLocalIPv4();

    // 广播 HTTP 服务
    bonjourService = bonjour.publish({
      name: `IoT Gateway (${config.gatewayId})`,
      type: 'http',
      port: httpPort,
      txt: {
        type: 'iot-gateway',
        version: '1.0',
        gateway_id: config.gatewayId,
        mqtt_port: String(mqttPort),
        mqtt_url: `mqtt://${ip}:${mqttPort}`,
      },
    });

    console.log(`[mDNS] published HTTP service on port ${httpPort} (addr ${ip})`);
  } catch (err: any) {
    console.warn(`[mDNS] failed to start: ${err.message}`);
  }
}

export function stopMdnsService() {
  if (bonjourService) {
    bonjourService.stop();
  }
  if (bonjour) {
    bonjour.destroy();
  }
}
