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

type Env = {
  DB: D1Database
  JWT_SECRET: string
  SCENE_EXECUTOR: DurableObjectNamespace
}

const scenesRoutes = new Hono<{ Bindings: Env }>()

scenesRoutes.get('/', async (c) => getScenes(c.req.raw, c.env as Env))
scenesRoutes.get('/:id', async (c) => getScene(c.req.raw, c.env as Env))
scenesRoutes.post('/', async (c) => createScene(c.req.raw, c.env as Env))
scenesRoutes.put('/:id', async (c) => updateScene(c.req.raw, c.env as Env))
scenesRoutes.delete('/:id', async (c) => deleteScene(c.req.raw, c.env as Env))
scenesRoutes.post('/:id/trigger', async (c) => executeScene(c.req.raw, c.env as Env))

export { scenesRoutes }
