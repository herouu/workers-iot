/**
 * WorkersIoT - Cloudflare Workers 入口文件
 */
import { Router } from 'itty-router'
import { authRouter } from './routes/auth'
import { devicesRouter } from './routes/devices'
import { scenesRouter } from './routes/scenes'
import { dataRouter } from './routes/data'
import { realtimeRouter } from './routes/realtime'
import { withCors } from './middleware/cors'
import { withAuth } from './middleware/auth'
import { notFound, jsonError } from './utils/response'
import { DeviceSession } from './durableObjects/DeviceSession'
import { SceneExecutor } from './durableObjects/SceneExecutor'
import { NotificationHub } from './durableObjects/NotificationHub'
import { RealtimeHub } from './durableObjects/RealtimeHub'

// 创建路由器
const router = Router()

// 公共路由
router.all('*', withCors)

// 健康检查
router.get('/health', () => {
  return new Response(JSON.stringify({
    status: 'ok',
    service: 'WorkersIoT',
    timestamp: Date.now()
  }), {
    headers: { 'Content-Type': 'application/json' }
  })
})

// API 版本
router.get('/api/v1', () => {
  return new Response(JSON.stringify({
    version: '1.0.0',
    name: 'WorkersIoT API',
    endpoints: {
      auth: '/api/v1/auth',
      devices: '/api/v1/devices',
      scenes: '/api/v1/scenes',
      data: '/api/v1/data'
    }
  }), {
    headers: { 'Content-Type': 'application/json' }
  })
})

// 认证路由 (公开)
router.all('/api/v1/auth/*', authRouter)

// 需要认证的路由
router.all('/api/v1/devices/*', withAuth, devicesRouter)
router.all('/api/v1/scenes/*', withAuth, scenesRouter)
router.all('/api/v1/data/*', withAuth, dataRouter)

// 实时通信路由 (WebSocket + Telemetry)
router.all('/realtime/*', realtimeRouter)

// 404 处理
router.all('*', () => notFound())

// 导出 Durable Objects (Wrangler 需要)
export { DeviceSession, SceneExecutor, NotificationHub, RealtimeHub }

// 导出 worker
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      return await router.handle(request, env, ctx)
    } catch (err) {
      console.error('Worker error:', err)
      return jsonError('Internal server error', 500)
    }
  }
}

// 类型声明
interface Env {
  DB: D1Database
  CACHE: KVNamespace
  STORAGE: R2Bucket
  DEVICE_SESSION: DurableObjectNamespace
  SCENE_EXECUTOR: DurableObjectNamespace
  NOTIFICATION_HUB: DurableObjectNamespace
  REALTIME_HUB: DurableObjectNamespace
  JWT_SECRET: string
  ENVIRONMENT: string
}

interface ExecutionContext {
  waitUntil(promise: Promise<void>): void
  passThroughOnException(): void
}
