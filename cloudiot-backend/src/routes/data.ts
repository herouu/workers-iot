/**
 * 数据路由
 */
import { Router } from 'itty-router'
import { getDeviceHistory, getStatistics } from '../handlers/dataHandler'

const router = Router()

// GET /api/v1/data/devices/:id/history - 获取设备历史数据
router.get('/devices/:id/history', getDeviceHistory)

// GET /api/v1/data/statistics - 获取统计数据
router.get('/statistics', getStatistics)

export { router as dataRouter }
