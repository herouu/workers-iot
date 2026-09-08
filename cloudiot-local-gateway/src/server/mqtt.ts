// aedes MQTT Broker
import { config } from '../config';
import { deviceModel } from '../models/device';
import { telemetryModel } from '../models/telemetry';
import { ruleEngine } from '../services/rule-engine';
import { commandDispatcher } from '../services/command-dispatcher';

let aedes: any = null;
let mqttServer: any = null;

// 注册 MQTT 发布函数到 command-dispatcher
function setupMqttPublisher() {
  if (!aedes) return;

  const publish = (topic: string, payload: string) => {
    aedes.publish({
      topic,
      payload: Buffer.from(payload),
      qos: 0,
      retain: false,
    }, (err?: Error) => {
      if (err) console.error(`[MQTT] publish error: ${err.message}`);
    });
  };

  commandDispatcher.registerMqttPublisher(publish);
}

export function startMqttServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const Aedes = require('aedes');
      aedes = new Aedes();

      // ===== 认证 =====
      aedes.authenticate = (client: any, username: any, password: any, callback: any) => {
        const deviceId = client.id;
        const secret = password ? password.toString() : '';

        const device = deviceModel.findById(deviceId);
        if (!device) {
          // 自动注册
          if (config.deviceAutoRegister) {
            const newDevice = deviceModel.autoRegister(deviceId, 'mqtt');
            console.log(`[MQTT] auto-registered device: ${deviceId}`);
            callback(null, true);
            return;
          }
          callback(new Error('Device not found'), false);
          return;
        }

        // 验证密钥
        if (device.secret_hash && device.salt) {
          const crypto = require('crypto');
          const hash = crypto.createHash('sha256').update(secret + device.salt).digest('hex');
          if (hash !== device.secret_hash) {
            callback(new Error('Invalid secret'), false);
            return;
          }
        }

        callback(null, true);
      };

      // ===== 授权发布 =====
      aedes.authorizePublish = (client: any, packet: any, callback: any) => {
        const prefix = `devices/${client.id}/`;
        if (packet.topic.startsWith(prefix)) {
          callback(null);
        } else {
          callback(new Error('Unauthorized topic'));
        }
      };

      // ===== 授权订阅 =====
      aedes.authorizeSubscribe = (client: any, sub: any, callback: any) => {
        const allowed = `devices/${client.id}/command`;
        if (sub.topic === allowed) {
          callback(null, sub);
        } else {
          callback(new Error('Unauthorized subscription'));
        }
      };

      // ===== 客户端连接 =====
      aedes.on('client', (client: any) => {
        console.log(`[MQTT] client connected: ${client.id}`);
        deviceModel.updateOnline(client.id, 'mqtt');

        // 分发 pending 命令
        commandDispatcher.dispatchPending(client.id);
      });

      // ===== 客户端断开 =====
      aedes.on('clientDisconnect', (client: any) => {
        console.log(`[MQTT] client disconnected: ${client.id}`);
        deviceModel.setOffline(client.id);
      });

      // ===== 消息处理 =====
      aedes.on('publish', (packet: any, client: any) => {
        if (!client) return; // 只处理已认证客户端

        const topic = packet.topic;
        const payload = packet.payload.toString();
        const deviceId = client.id;

        // 解析主题: devices/{id}/telemetry
        const parts = topic.split('/');
        if (parts.length < 3) return;

        const messageType = parts[2]; // telemetry, status, ack

        try {
          const data = JSON.parse(payload);

          switch (messageType) {
            case 'telemetry': {
              // 存储遥测
              telemetryModel.insert({
                device_id: deviceId,
                data: data.data || data,
                source: 'mqtt',
                timestamp: data.timestamp,
              });

              // 触发规则引擎
              ruleEngine.evaluate({
                device_id: deviceId,
                data: data.data || data,
                timestamp: data.timestamp || Math.floor(Date.now() / 1000),
              });

              // 更新在线状态
              deviceModel.updateOnline(deviceId, 'mqtt');
              break;
            }
            case 'status': {
              // 设备状态更新
              if (data.online !== undefined) {
                if (data.online) {
                  deviceModel.updateOnline(deviceId, 'mqtt');
                } else {
                  deviceModel.setOffline(deviceId);
                }
              }
              break;
            }
            case 'ack': {
              // 命令回执
              if (data.command_id) {
                commandDispatcher.handleAck(deviceId, data.command_id, data.success !== false);
              }
              break;
            }
          }
        } catch (err: any) {
          console.error(`[MQTT] message error from ${deviceId}: ${err.message}`);
        }
      });

      // ===== 启动 TCP 服务器 =====
      const net = require('net');
      mqttServer = net.createServer(aedes.handle);

      mqttServer.listen(config.mqttPort, () => {
        console.log(`[MQTT] broker started on port ${config.mqttPort}`);
        setupMqttPublisher();
        resolve();
      });

      mqttServer.on('error', (err: Error) => {
        console.error(`[MQTT] server error: ${err.message}`);
        reject(err);
      });

    } catch (err: any) {
      console.error(`[MQTT] failed to start: ${err.message}`);
      reject(err);
    }
  });
}

export function stopMqttServer(): Promise<void> {
  return new Promise((resolve) => {
    if (mqttServer) {
      mqttServer.close(() => {
        aedes?.close();
        resolve();
      });
    } else {
      resolve();
    }
  });
}
