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
  getDeviceData
} from '../handlers/deviceHandler'
import { authMiddleware } from '../middleware/auth'

type Env = {
  DB: D1Database
  JWT_SECRET: string
  DEVICE_SESSION: DurableObjectNamespace
}

// 认证中间件写入的上下文变量
type Variables = {
  userId: string
  userEmail?: string
}

const devicesRoutes = new Hono<{ Bindings: Env; Variables: Variables }>()

// 挂载认证中间件（全部设备接口需登录）
devicesRoutes.use('*', authMiddleware)

devicesRoutes.get('/', async (c) => getDevices(c.req.raw, c.env as Env, c.get('userId')))
devicesRoutes.get('/:id', async (c) => getDevice(c.req.raw, c.env as Env, c.get('userId')))
devicesRoutes.post('/', async (c) => createDevice(c.req.raw, c.env as Env, c.get('userId')))
devicesRoutes.put('/:id', async (c) => updateDevice(c.req.raw, c.env as Env, c.get('userId')))
devicesRoutes.delete('/:id', async (c) => deleteDevice(c.req.raw, c.env as Env, c.get('userId')))
devicesRoutes.post('/:id/control', async (c) => controlDevice(c.req.raw, c.env as Env, c.get('userId')))
devicesRoutes.post('/provision', async (c) => provisionDevice(c.req.raw, c.env as Env, c.get('userId')))
devicesRoutes.get('/:id/data', async (c) => getDeviceData(c.req.raw, c.env as Env, c.get('userId')))

export { devicesRoutes }
