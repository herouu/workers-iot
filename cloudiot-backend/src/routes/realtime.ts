/**
 * 实时通信路由
 */
import { Hono } from 'hono'

type Env = {
  DB: D1Database
  REALTIME_HUB: DurableObjectNamespace
}

const realtimeRoutes = new Hono<{ Bindings: Env }>()

// WebSocket 连接
realtimeRoutes.get('/ws', async (c) => {
  const doId = c.env.REALTIME_HUB.idFromName('main-hub')
  const doStub = c.env.REALTIME_HUB.get(doId)
  return doStub.fetch(c.req.raw)
})

// 设备数据上报
realtimeRoutes.post('/telemetry', async (c) => {
  try {
    const body = await c.req.json()
    const { device_id, data, timestamp } = body
    
    if (!device_id || !data) {
      return c.json({ success: false, error: 'device_id and data are required' }, 400)
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

// 获取待处理命令
realtimeRoutes.get('/commands/:deviceId', async (c) => {
  try {
    const deviceId = c.req.param('deviceId')
    const since = parseInt(c.req.query('since') || '0')
    
    const result = await c.env.DB
      .prepare(`SELECT * FROM device_commands WHERE device_id = ? AND timestamp > ? AND status = 'pending' ORDER BY timestamp ASC`)
      .bind(deviceId, since)
      .all()
    
    for (const cmd of result.results) {
      await c.env.DB
        .prepare('UPDATE device_commands SET status = ? WHERE id = ?')
        .bind('sent', (cmd as any).id)
        .run()
    }
    
    return c.json({ commands: result.results, serverTime: Date.now() })
  } catch (err) {
    console.error('Get commands error:', err)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// 下发命令
realtimeRoutes.post('/commands/:deviceId', async (c) => {
  try {
    const deviceId = c.req.param('deviceId')
    const body = await c.req.json()
    const { command, params } = body
    
    if (!command) {
      return c.json({ success: false, error: 'command is required' }, 400)
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
