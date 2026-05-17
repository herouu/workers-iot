/**
 * 数据路由
 */
import { Hono } from 'hono'
import { getDeviceHistory, getStatistics } from '../handlers/dataHandler'

type Env = {
  DB: D1Database
}

const dataRoutes = new Hono<{ Bindings: Env }>()

dataRoutes.get('/devices/:id', async (c) => getDeviceHistory(c.req.raw, c.env as Env))
dataRoutes.get('/stats', async (c) => getStatistics(c.req.raw, c.env as Env))

export { dataRoutes }
