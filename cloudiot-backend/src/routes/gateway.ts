/**
 * 网关云同步路由（供 cloudiot-local-gateway 调用）
 *
 * 注意：前缀为 /api（不含 /v1），与网关 cloud-sync.ts 中的调用路径严格一致。
 * 所有接口均需通过 gatewayAuth 校验 GATEWAY_API_KEY。
 */
import { Hono } from 'hono'
import { gatewayAuth } from '../middleware/gatewayAuth'
import { ACK_TIMEOUT_MS } from '../utils/constants'

type Env = {
  DB: D1Database
  GATEWAY_API_KEY: string
}

const gatewayRoutes = new Hono<{ Bindings: Env }>()

// 全部网关接口需通过静态密钥鉴权
gatewayRoutes.use('*', gatewayAuth)

// JSON 安全解析（容错非法 JSON，返回空对象）
function safeParse(value: any): any {
  if (value === null || value === undefined) return {}
  try {
    return JSON.parse(value)
  } catch {
    return {}
  }
}

// 1. 批量上传遥测数据
// body: { gateway_id, data: [{ id, device_id, data(对象), source, timestamp }] }
gatewayRoutes.post('/telemetry/batch', async (c) => {
  try {
    const body = await c.req.json()
    const { gateway_id, data } = body || {}

    if (!gateway_id || !Array.isArray(data)) {
      return c.json({ error: 'gateway_id and data array are required' }, 400)
    }

    let count = 0

    for (const item of data) {
      // 格式校验：device_id 必填，data 必须是对象
      if (!item || !item.device_id || typeof item.data !== 'object' || item.data === null) {
        return c.json({ error: 'invalid telemetry item format' }, 400)
      }

      // 设备不存在则跳过（避免外键约束失败）
      const device = await c.env.DB
        .prepare('SELECT id FROM devices WHERE id = ?')
        .bind(item.device_id)
        .first()

      if (!device) {
        continue
      }

      const timestamp = item.timestamp || Date.now()

      await c.env.DB
        .prepare('INSERT INTO device_states (device_id, state, timestamp) VALUES (?, ?, ?)')
        .bind(item.device_id, JSON.stringify(item.data), timestamp)
        .run()

      await c.env.DB
        .prepare('UPDATE devices SET online = 1, updated_at = ? WHERE id = ?')
        .bind(Date.now(), item.device_id)
        .run()

      count++
    }

    return c.json({ success: true, count })

  } catch (err) {
    console.error('Telemetry batch error:', err)
    return c.json({ error: 'invalid request body' }, 400)
  }
})

// 2. 拉取待下发命令
// 返回 { commands: [{ device_id, command, params(对象), id }] }，拉取后置为 'sent'
// 只拉取 gateway_id 归属本网关设备的命令；云端直连设备（gateway_id 为空）命令不被网关拉取
gatewayRoutes.get('/commands/pending', async (c) => {
  try {
    const gatewayId = c.req.query('gateway_id')

    if (!gatewayId) {
      return c.json({ error: 'gateway_id is required' }, 400)
    }

    // 原子领取 + 超时重投：只领取 pending，或超过 ACK 窗口仍无人回执的 sent
    // 单条 UPDATE...RETURNING 与设备侧领取互斥，避免并发重复投递
    const result = await c.env.DB
      .prepare(`
        UPDATE device_commands
        SET status = 'sent', executed_at = ?
        WHERE device_id IN (SELECT id FROM devices WHERE gateway_id = ?)
          AND (status = 'pending' OR (status = 'sent' AND executed_at < ?))
        RETURNING id, device_id, command, params, timestamp
      `)
      .bind(Date.now(), gatewayId, Date.now() - ACK_TIMEOUT_MS)
      .all()

    const commands = (result.results as any[]).map((cmd) => ({
      id: cmd.id,
      device_id: cmd.device_id,
      command: cmd.command,
      params: safeParse(cmd.params)
    }))

    return c.json({ commands })

  } catch (err) {
    console.error('Get pending commands error:', err)
    return c.json({ error: 'Failed to get pending commands' }, 500)
  }
})

// 3. 上传设备状态
// body: { gateway_id, devices: [{ id, online, last_seen, protocol }] }
gatewayRoutes.post('/devices/sync', async (c) => {
  try {
    const body = await c.req.json()
    const { gateway_id, devices } = body || {}

    if (!gateway_id || !Array.isArray(devices)) {
      return c.json({ error: 'gateway_id and devices array are required' }, 400)
    }

    let synced = 0

    for (const item of devices) {
      if (!item || !item.id) {
        return c.json({ error: 'invalid device item format' }, 400)
      }

      // 设备不存在时 UPDATE 影响 0 行，即跳过
      // gateway_id 相同则再次确认归属；不同则更新为当前上报网关（迁移配对）
      const res = await c.env.DB
        .prepare('UPDATE devices SET online = ?, last_seen = ?, protocol = ?, gateway_id = ? WHERE id = ?')
        .bind(item.online ? 1 : 0, item.last_seen ?? null, item.protocol ?? null, gateway_id, item.id)
        .run()

      if (res.meta && res.meta.changes > 0) {
        synced++
      }
    }

    return c.json({ success: true, synced })

  } catch (err) {
    console.error('Device sync error:', err)
    return c.json({ error: 'invalid request body' }, 400)
  }
})

export { gatewayRoutes }
