/**
 * 设备路由
 */
import { Router } from 'itty-router'
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

const router = Router()

// GET /api/v1/devices - 获取设备列表
router.get('/', getDevices)

// GET /api/v1/devices/:id - 获取设备详情
router.get('/:id', getDevice)

// POST /api/v1/devices - 创建设备
router.post('/', createDevice)

// PUT /api/v1/devices/:id - 更新设备
router.put('/:id', updateDevice)

// DELETE /api/v1/devices/:id - 删除设备
router.delete('/:id', deleteDevice)

// POST /api/v1/devices/:id/control - 控制设备
router.post('/:id/control', controlDevice)

// POST /api/v1/devices/provision - 设备配网
router.post('/provision', provisionDevice)

// GET /api/v1/devices/:id/data - 获取设备数据
router.get('/:id/data', getDeviceData)

export { router as devicesRouter }
