/**
 * 设备路由
 */
import { Hono } from 'hono'
import {
  getDevices,
  getDevice,
  createDevice,
  updateDevice,
  deleteDevice,
  controlDevice,
  provisionDevice,
  getDeviceData,
  rotateDeviceSecret
} from '../handlers/deviceHandler'
import { handleDeviceAuth } from '../handlers/deviceAuthHandler'
import { authMiddleware } from '../middleware/auth'

// 认证中间件写入的上下文变量
type Variables = {
  userId: string
  userEmail?: string
}

const devicesRoutes = new Hono<{ Bindings: Env; Variables: Variables }>()

// 设备认证（无需用户登录，设备用 secret 换 token）
devicesRoutes.post('/auth', async (c) => handleDeviceAuth(c.req.raw, c.env as Env))
devicesRoutes.get('/', authMiddleware, async (c) => getDevices(c.req.raw, c.env as Env, c.get('userId')))
devicesRoutes.get('/:id', authMiddleware, async (c) => getDevice(c.req.raw, c.env as Env, c.get('userId')))
devicesRoutes.post('/', authMiddleware, async (c) => createDevice(c.req.raw, c.env as Env, c.get('userId')))
devicesRoutes.put('/:id', authMiddleware, async (c) => updateDevice(c.req.raw, c.env as Env, c.get('userId')))
devicesRoutes.delete('/:id', authMiddleware, async (c) => deleteDevice(c.req.raw, c.env as Env, c.get('userId')))
devicesRoutes.post('/:id/control', authMiddleware, async (c) => controlDevice(c.req.raw, c.env as Env, c.get('userId')))
devicesRoutes.post('/provision', authMiddleware, async (c) => provisionDevice(c.req.raw, c.env as Env, c.get('userId')))
devicesRoutes.post('/:id/rotate-secret', authMiddleware, async (c) => rotateDeviceSecret(c.req.raw, c.env as Env, c.get('userId')))
devicesRoutes.get('/:id/data', authMiddleware, async (c) => getDeviceData(c.req.raw, c.env as Env, c.get('userId')))

export { devicesRoutes }
