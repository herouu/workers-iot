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

type Env = {
  DB: D1Database
  JWT_SECRET: string
  DEVICE_SESSION: DurableObjectNamespace
}

const devicesRoutes = new Hono<{ Bindings: Env }>()

devicesRoutes.get('/', async (c) => getDevices(c.req.raw, c.env as Env))
devicesRoutes.get('/:id', async (c) => getDevice(c.req.raw, c.env as Env))
devicesRoutes.post('/', async (c) => createDevice(c.req.raw, c.env as Env))
devicesRoutes.put('/:id', async (c) => updateDevice(c.req.raw, c.env as Env))
devicesRoutes.delete('/:id', async (c) => deleteDevice(c.req.raw, c.env as Env))
devicesRoutes.post('/:id/control', async (c) => controlDevice(c.req.raw, c.env as Env))
devicesRoutes.post('/provision', async (c) => provisionDevice(c.req.raw, c.env as Env))
devicesRoutes.get('/:id/data', async (c) => getDeviceData(c.req.raw, c.env as Env))

export { devicesRoutes }
