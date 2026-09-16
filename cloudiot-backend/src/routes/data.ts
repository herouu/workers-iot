/**
 * 数据路由
 */
import { Hono } from 'hono'
import { getDeviceHistory, getDeviceStats, getStatistics } from '../handlers/dataHandler'
import { authMiddleware } from '../middleware/auth'

type Env = {
  DB: D1Database
}

// 认证中间件写入的上下文变量
type Variables = {
  userId: string
  userEmail?: string
}

const dataRoutes = new Hono<{ Bindings: Env; Variables: Variables }>()

// 挂载认证中间件（全部数据接口需登录）
dataRoutes.use('*', authMiddleware)

dataRoutes.get('/devices/:id', async (c) => getDeviceHistory(c.req.raw, c.env as Env, c.get('userId')))
dataRoutes.get('/devices/:id/stats', async (c) => getDeviceStats(c.req.raw, c.env as Env, c.get('userId')))
dataRoutes.get('/stats', async (c) => getStatistics(c.req.raw, c.env as Env, c.get('userId')))

export { dataRoutes }
