/**
 * 场景路由
 */
import { Hono } from 'hono'
import {
  getScenes,
  getScene,
  createScene,
  updateScene,
  deleteScene,
  executeScene
} from '../handlers/sceneHandler'
import { authMiddleware } from '../middleware/auth'

// 认证中间件写入的上下文变量
type Variables = {
  userId: string
  userEmail?: string
}

const scenesRoutes = new Hono<{ Bindings: Env; Variables: Variables }>()

// 挂载认证中间件（全部场景接口需登录）
scenesRoutes.use('*', authMiddleware)

scenesRoutes.get('/', async (c) => getScenes(c.req.raw, c.env as Env, c.get('userId')))
scenesRoutes.get('/:id', async (c) => getScene(c.req.raw, c.env as Env, c.get('userId')))
scenesRoutes.post('/', async (c) => createScene(c.req.raw, c.env as Env, c.get('userId')))
scenesRoutes.put('/:id', async (c) => updateScene(c.req.raw, c.env as Env, c.get('userId')))
scenesRoutes.delete('/:id', async (c) => deleteScene(c.req.raw, c.env as Env, c.get('userId')))
scenesRoutes.post('/:id/trigger', async (c) => executeScene(c.req.raw, c.env as Env, c.get('userId')))

export { scenesRoutes }
