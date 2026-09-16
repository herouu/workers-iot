/**
 * 实时通信路由
 */
import { Hono } from 'hono'
import { deviceAuthMiddleware } from '../middleware/deviceAuth'
import { authMiddleware } from '../middleware/auth'
import { ACK_TIMEOUT_MS } from '../utils/constants'

type Env = {
  DB: D1Database
  REALTIME_HUB: DurableObjectNamespace
  JWT_SECRET: string
}

// 设备认证中间件写入的上下文变量
type Variables = {
  deviceId?: string
  userId?: string
}

const realtimeRoutes = new Hono<{ Bindings: Env; Variables: Variables }>()

// WebSocket 连接
realtimeRoutes.get('/ws', async (c) => {
  const doId = c.env.REALTIME_HUB.idFromName('main-hub')
  const doStub = c.env.REALTIME_HUB.get(doId)
  return doStub.fetch(c.req.raw)
})

// 设备数据上报
realtimeRoutes.post('/telemetry', deviceAuthMiddleware, async (c) => {
  try {
    const body = await c.req.json()
    const { device_id, data, timestamp } = body

    if (!device_id || !data) {
      return c.json({ success: false, error: 'device_id and data are required' }, 400)
    }
    if (device_id !== c.get('deviceId')) {
      return c.json({ success: false, error: 'Device token does not match device_id' }, 403)
    }

    await c.env.DB
      .prepare(`INSERT INTO device_states (device_id, state, timestamp) VALUES (?, ?, ?)`)
      .bind(device_id, JSON.stringify(data), timestamp || Date.now())
      .run()

    await c.env.DB
      .prepare('UPDATE devices SET online = 1, updated_at = ? WHERE id = ?')
      .bind(Date.now(), device_id)
      .run()

    const doId = c.env.REALTIME_HUB.idFromName('main-hub')
    const doStub = c.env.REALTIME_HUB.get(doId)
    await doStub.fetch(new Request('http://internal/broadcast', {
      method: 'POST',
      body: JSON.stringify({
        deviceId: device_id,
        event: 'telemetry',
        data: { device_id, ...data, timestamp: timestamp || Date.now() }
      })
    }))

    return c.json({ success: true, timestamp: Date.now() })
  } catch (err) {
    console.error('Telemetry error:', err)
    return c.json({ success: false, error: 'Internal server error' }, 500)
  }
})

// 获取待处理命令（原子领取：单条 UPDATE ... RETURNING 防止并发重复投递）
realtimeRoutes.get('/commands/:deviceId', deviceAuthMiddleware, async (c) => {
  try {
    const deviceId = c.req.param('deviceId')
    if (deviceId !== c.get('deviceId')) {
      return c.json({ success: false, error: 'Device token does not match device_id' }, 403)
    }

    const result = await c.env.DB
      .prepare(`
        UPDATE device_commands
        SET status = 'sent', executed_at = ?
        WHERE device_id = ?
          AND (status = 'pending' OR (status = 'sent' AND executed_at < ?))
        RETURNING id, command, params, timestamp
      `)
      .bind(Date.now(), deviceId, Date.now() - ACK_TIMEOUT_MS)
      .all()

    return c.json({ commands: result.results, serverTime: Date.now() })
  } catch (err) {
    console.error('Get commands error:', err)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// 命令回执（设备执行完成后上报结果）
realtimeRoutes.post('/commands/:deviceId/ack', deviceAuthMiddleware, async (c) => {
  try {
    const deviceId = c.req.param('deviceId')
    if (deviceId !== c.get('deviceId')) {
      return c.json({ success: false, error: 'Device token does not match device_id' }, 403)
    }

    const body = await c.req.json()
    const { command_id, success } = body

    if (!command_id) {
      return c.json({ success: false, error: 'command_id is required' }, 400)
    }

    await c.env.DB
      .prepare(`
        UPDATE device_commands
        SET status = ?, acked_at = ?
        WHERE id = ? AND device_id = ? AND status = 'sent'
      `)
      .bind(success ? 'acked' : 'failed', Date.now(), command_id, deviceId)
      .run()

    return c.json({ success: true })
  } catch (err) {
    console.error('Command ACK error:', err)
    return c.json({ success: false, error: 'Internal server error' }, 500)
  }
})

// 下发命令（需用户登录：该接口为 App 端下发路径）
realtimeRoutes.post('/commands/:deviceId', authMiddleware, async (c) => {
  try {
    const deviceId = c.req.param('deviceId')
    const body = await c.req.json()
    const { command, params } = body
    
    if (!command) {
      return c.json({ success: false, error: 'command is required' }, 400)
    }

    // 只允许设备归属人下发命令
    const device = await c.env.DB
      .prepare('SELECT id FROM devices WHERE id = ? AND user_id = ?')
      .bind(deviceId, c.get('userId'))
      .first()

    if (!device) {
      return c.json({ success: false, error: 'Device not found or no permission' }, 404)
    }
    
    const commandId = crypto.randomUUID()
    const timestamp = Date.now()
    
    await c.env.DB
      .prepare(`INSERT INTO device_commands (id, device_id, command, params, timestamp, status) VALUES (?, ?, ?, ?, ?, 'pending')`)
      .bind(commandId, deviceId, command, JSON.stringify(params || {}), timestamp)
      .run()
    
    const doId = c.env.REALTIME_HUB.idFromName('main-hub')
    const doStub = c.env.REALTIME_HUB.get(doId)
    await doStub.fetch(new Request('http://internal/broadcast', {
      method: 'POST',
      body: JSON.stringify({
        deviceId: deviceId,
        event: 'command',
        data: { commandId, command, params, timestamp }
      })
    }))
    
    return c.json({ success: true, commandId, timestamp })
  } catch (err) {
    console.error('Send command error:', err)
    return c.json({ success: false, error: 'Internal server error' }, 500)
  }
})

export { realtimeRoutes }
