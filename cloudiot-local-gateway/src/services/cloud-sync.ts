// 云同步服务
import { config } from '../config';
import { db } from '../db/index';
import { telemetryModel } from '../models/telemetry';
import { deviceModel } from '../models/device';

interface SyncResult {
  uploaded: number;
  downloaded: number;
  errors: string[];
}

export const cloudSync = {
  // 执行同步
  async sync(): Promise<SyncResult> {
    const result: SyncResult = { uploaded: 0, downloaded: 0, errors: [] };

    if (!config.cloudApi || !config.cloudKey) {
      return result;
    }

    try {
      // 1. 上传遥测数据
      const unsynced = telemetryModel.findUnsynced(100);
      if (unsynced.length > 0) {
        const res = await fetch(`${config.cloudApi}/api/telemetry/batch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.cloudKey}`,
          },
          body: JSON.stringify({
            gateway_id: config.gatewayId,
            data: unsynced.map(t => ({
              id: t.id,
              device_id: t.device_id,
              data: JSON.parse(t.data),
              source: t.source,
              timestamp: t.timestamp,
            })),
          }),
        });

        if (res.ok) {
          telemetryModel.markSynced(unsynced.map(t => t.id));
          result.uploaded = unsynced.length;
        } else {
          const text = await res.text();
          result.errors.push(`upload failed: ${res.status} ${text}`);
        }
      }

      // 2. 拉取远程命令
      const cmdRes = await fetch(`${config.cloudApi}/api/commands/pending?gateway_id=${config.gatewayId}`, {
        headers: { 'Authorization': `Bearer ${config.cloudKey}` },
      });

      if (cmdRes.ok) {
        const { commands } = await cmdRes.json();
        if (commands && Array.isArray(commands)) {
          const { commandModel } = require('../models/command');
          for (const cmd of commands) {
            commandModel.insert({
              device_id: cmd.device_id,
              command: cmd.command,
              params: cmd.params,
              source: 'cloud',
            });
          }
          result.downloaded = commands.length;
        }
      }

      // 3. 上传设备状态
      const devices = deviceModel.findAll();
      await fetch(`${config.cloudApi}/api/devices/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.cloudKey}`,
        },
        body: JSON.stringify({
          gateway_id: config.gatewayId,
          devices: devices.map(d => ({
            id: d.id,
            online: d.online,
            last_seen: d.last_seen,
            protocol: d.protocol,
          })),
        }),
      });

    } catch (err: any) {
      result.errors.push(`sync error: ${err.message}`);
    }

    return result;
  },

  // 启动定时同步
  startScheduler(): () => void {
    const run = async () => {
      const result = await cloudSync.sync();
      if (result.uploaded > 0 || result.downloaded > 0 || result.errors.length > 0) {
        console.log(`[sync] uploaded=${result.uploaded}, downloaded=${result.downloaded}, errors=${result.errors.length}`);
      }
    };

    // 立即执行一次
    run();

    const interval = setInterval(run, config.syncInterval);
    return () => clearInterval(interval);
  },
};
