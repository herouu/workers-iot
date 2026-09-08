// 命令分发器 - HTTP/MQTT 自适应投递
import { commandModel, NewCommand } from '../models/command';
import { deviceModel } from '../models/device';
import { ruleEngine } from './rule-engine';

let mqttPublish: ((topic: string, payload: string) => void) | null = null;

export const commandDispatcher = {
  // 注册 MQTT 发布函数（由 mqtt.ts 注入）
  registerMqttPublisher(fn: (topic: string, payload: string) => void): void {
    mqttPublish = fn;
  },

  // 插入命令并尝试投递
  insert(cmd: NewCommand): void {
    const command = commandModel.insert(cmd);

    // 尝试 MQTT 投递
    const device = deviceModel.findById(cmd.device_id);
    if (device && (device.protocol === 'mqtt' || device.protocol === 'both') && mqttPublish) {
      try {
        const topic = `devices/${cmd.device_id}/command`;
        const payload = JSON.stringify({
          id: command.id,
          command: cmd.command,
          params: cmd.params,
        });
        mqttPublish(topic, payload);
        commandModel.markSent(command.id);
      } catch {
        // MQTT 投递失败，等 HTTP 轮询
      }
    }
  },

  // MQTT 命令 ACK 处理
  handleAck(deviceId: string, commandId: string, success: boolean): void {
    if (success) {
      commandModel.markAcked(commandId);
    } else {
      commandModel.markFailed(commandId);
    }
  },

  // 分发所有 pending 命令（用于设备重连时）
  dispatchPending(deviceId: string): void {
    const device = deviceModel.findById(deviceId);
    if (!device || !mqttPublish) return;

    const pending = commandModel.findPending(deviceId);
    for (const cmd of pending) {
      try {
        const topic = `devices/${deviceId}/command`;
        const payload = JSON.stringify({
          id: cmd.id,
          command: cmd.command,
          params: cmd.params ? JSON.parse(cmd.params) : undefined,
        });
        mqttPublish!(topic, payload);
        commandModel.markSent(cmd.id);
      } catch {
        break;
      }
    }
  },
};
