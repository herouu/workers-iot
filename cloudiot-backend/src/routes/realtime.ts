/**
 * 实时通信路由
 * 处理 WebSocket 连接和设备数据上报
 */
import { Router } from 'itty-router'
import { verifyToken } from '../middleware/auth'

const router = Router()

// WebSocket 连接升级
router.get('/ws', async (request: Request, env: Env): Promise<Response> => {
  const url = new URL(request.url)
  const token = url.searchParams.get('token')
  
  // 验证 token
  if (!token) {
    // 尝试从 cookie 获取
    const cookies = request.headers.get('Cookie') || ''
    const match = cookies.match(/auth_token=([^;]+)/)
    if (match) {
      const payload = await verifyToken(match[1], env.JWT_SECRET)
      if (!payload) {
        return new Response('Unauthorized', { status: 401 })
      }
    } else {
      return new Response('Unauthorized', { status: 401 })
    }
  } else {
    const payload = await verifyToken(token, env.JWT_SECRET)
    if (!payload) {
      return new Response('Unauthorized', { status: 401 })
    }
  }
  
  // 获取 Durable Object
  const doId = env.REALTIME_HUB.idFromName('main-hub')
  const doStub = env.REALTIME_HUB.get(doId)
  
  // 转发到 Durable Object
  return doStub.fetch(request)
})

// 设备数据上报 (HTTP POST)
router.post('/telemetry', async (request: Request, env: Env): Promise<Response> => {
  try {
    const body = await request.json()
    const { device_id, data, timestamp } = body
    
    if (!device_id || !data) {
      return new Response(JSON.stringify({
        success: false,
        error: 'device_id and data are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    // 验证设备 (简化版: 通过 device_id 验证)
    const authHeader = request.headers.get('Authorization')
    const authToken = authHeader?.replace('Bearer ', '')
    
    if (authToken) {
      const payload = await verifyToken(authToken, env.JWT_SECRET)
      if (!payload) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Unauthorized'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        })
      }
    }
    
    // 存储数据到 D1
    await env.DB
      .prepare(`
        INSERT INTO device_states (device_id, state, timestamp)
        VALUES (?, ?, ?)
      `)
      .bind(device_id, JSON.stringify(data), timestamp || Date.now())
      .run()
    
    // 更新设备在线状态
    await env.DB
      .prepare('UPDATE devices SET online = 1, updated_at = ? WHERE id = ?')
      .bind(Date.now(), device_id)
      .run()
    
    // 通知实时 Hub
    const doId = env.REALTIME_HUB.idFromName('main-hub')
    const doStub = env.REALTIME_HUB.get(doId)
    await doStub.fetch(new Request('http://internal/broadcast', {
      method: 'POST',
      body: JSON.stringify({
        deviceId: device_id,
        event: 'telemetry',
        data: { device_id, ...data, timestamp: timestamp || Date.now() }
      })
    }))
    
    return new Response(JSON.stringify({
      success: true,
      timestamp: Date.now()
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
    
  } catch (err) {
    console.error('Telemetry error:', err)
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})

// 设备获取待处理命令 (HTTP GET - 轮询方式)
router.get('/commands/:deviceId', async (request: Request, env: Env): Promise<Response> => {
  try {
    const url = new URL(request.url)
    const deviceId = url.pathname.split('/').pop()
    const since = parseInt(url.searchParams.get('since') || '0')
    
    // 获取该设备的新命令
    const result = await env.DB
      .prepare(`
        SELECT * FROM device_commands 
        WHERE device_id = ? AND timestamp > ? AND status = 'pending'
        ORDER BY timestamp ASC
      `)
      .bind(deviceId, since)
      .all()
    
    // 更新命令状态为已发送
    for (const cmd of result.results) {
      await env.DB
        .prepare('UPDATE device_commands SET status = ? WHERE id = ?')
        .bind('sent', (cmd as any).id)
        .run()
    }
    
    return new Response(JSON.stringify({
      commands: result.results,
      serverTime: Date.now()
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
    
  } catch (err) {
    console.error('Get commands error:', err)
    return new Response(JSON.stringify({
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})

// App 下发命令
router.post('/commands/:deviceId', async (request: Request, env: Env): Promise<Response> => {
  try {
    const url = new URL(request.url)
    const deviceId = url.pathname.split('/').pop()
    const body = await request.json()
    const { command, params } = body
    
    if (!command) {
      return new Response(JSON.stringify({
        success: false,
        error: 'command is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    // 创建命令记录
    const commandId = crypto.randomUUID()
    const timestamp = Date.now()
    
    await env.DB
      .prepare(`
        INSERT INTO device_commands (id, device_id, command, params, timestamp, status)
        VALUES (?, ?, ?, ?, ?, 'pending')
      `)
      .bind(commandId, deviceId, command, JSON.stringify(params || {}), timestamp)
      .run()
    
    // 通知实时 Hub
    const doId = env.REALTIME_HUB.idFromName('main-hub')
    const doStub = env.REALTIME_HUB.get(doId)
    await doStub.fetch(new Request('http://internal/broadcast', {
      method: 'POST',
      body: JSON.stringify({
        deviceId: deviceId,
        event: 'command',
        data: { commandId, command, params, timestamp }
      })
    }))
    
    return new Response(JSON.stringify({
      success: true,
      commandId,
      timestamp
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
    
  } catch (err) {
    console.error('Send command error:', err)
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})

export { router as realtimeRouter }

// 类型声明
interface Env {
  DB: D1Database
  REALTIME_HUB: DurableObjectNamespace
  JWT_SECRET: string
}
