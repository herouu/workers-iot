/**
 * 场景路由
 */
import { Router } from 'itty-router'
import {
  getScenes,
  getScene,
  createScene,
  updateScene,
  deleteScene,
  executeScene
} from '../handlers/sceneHandler'

const router = Router()

// GET /api/v1/scenes - 获取场景列表
router.get('/', getScenes)

// GET /api/v1/scenes/:id - 获取场景详情
router.get('/:id', getScene)

// POST /api/v1/scenes - 创建场景
router.post('/', createScene)

// PUT /api/v1/scenes/:id - 更新场景
router.put('/:id', updateScene)

// DELETE /api/v1/scenes/:id - 删除场景
router.delete('/:id', deleteScene)

// POST /api/v1/scenes/:id/execute - 执行场景
router.post('/:id/execute', executeScene)

export { router as scenesRouter }
