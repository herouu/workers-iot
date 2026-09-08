// mDNS 服务发现
import { config } from '../config';

let bonjour: any = null;
let bonjourService: any = null;

export function startMdnsService(httpPort: number, mqttPort: number) {
  try {
    bonjour = require('bonjour')();

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
        mqtt_url: `mqtt://0.0.0.0:${mqttPort}`,
      },
    });

    console.log(`[mDNS] published HTTP service on port ${httpPort}`);
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
