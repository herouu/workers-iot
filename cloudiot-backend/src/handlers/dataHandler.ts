/**
 * 数据处理器
 */
import { jsonResponse, jsonError, notFound, forbidden } from '../utils/response'

function getUserId(request: Request): string {
  return request.headers.get('x-user-id') || ''
}

function extractId(url: string): string {
  const segments = new URL(url).pathname.split('/')
  return segments[segments.length - 1]
}

// 获取设备历史数据
export async function getDeviceHistory(request: Request, env: Env): Promise<Response> {
  try {
    const userId = getUserId(request)
    const deviceId = extractId(request.url)
    const url = new URL(request.url)
    
    const start = url.searchParams.get('start')
      ? parseInt(url.searchParams.get('start')!)
      : Date.now() - 86400000 // 默认 24 小时前
    
    const end = url.searchParams.get('end')
      ? parseInt(url.searchParams.get('end')!)
      : Date.now()
    
    const limit = parseInt(url.searchParams.get('limit') || '1000')
    
    // 检查设备权限
    const device = await env.DB
      .prepare('SELECT * FROM devices WHERE id = ?')
      .bind(deviceId)
      .first()
    
    if (!device) {
      return notFound('Device not found')
    }
    
    if (device.user_id !== userId) {
      return forbidden('No permission to access this device')
    }
    
    const result = await env.DB
      .prepare(`
        SELECT * FROM device_states 
        WHERE device_id = ? AND timestamp >= ? AND timestamp <= ?
        ORDER BY timestamp ASC
        LIMIT ?
      `)
      .bind(deviceId, start, end, limit)
      .all()
    
    const history = result.results.map((r: any) => ({
      state: JSON.parse(r.state),
      timestamp: r.timestamp
    }))
    
    return jsonResponse({
      deviceId,
      start,
      end,
      count: history.length,
      history
    })
    
  } catch (err) {
    console.error('Get device history error:', err)
    return jsonError('Failed to get device history', 500)
  }
}

// 获取统计数据
export async function getStatistics(request: Request, env: Env): Promise<Response> {
  try {
    const userId = getUserId(request)
    const url = new URL(request.url)
    
    const period = url.searchParams.get('period') || 'day' // day, week, month
    
    let start: number
    const now = Date.now()
    
    switch (period) {
      case 'week':
        start = now - 7 * 86400000
        break
      case 'month':
        start = now - 30 * 86400000
        break
      default:
        start = now - 86400000
    }
    
    // 设备统计
    const deviceStats = await env.DB
      .prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN online = 1 THEN 1 ELSE 0 END) as online,
          SUM(CASE WHEN online = 0 THEN 1 ELSE 0 END) as offline
        FROM devices 
        WHERE user_id = ?
      `)
      .bind(userId)
      .first()
    
    // 场景执行统计
    const sceneStats = await env.DB
      .prepare(`
        SELECT COUNT(*) as total_executions
        FROM scene_logs sl
        JOIN scenes s ON sl.scene_id = s.id
        WHERE s.user_id = ? AND sl.executed_at >= ?
      `)
      .bind(userId, start)
      .first()
    
    // 设备类型分布
    const typeDistribution = await env.DB
      .prepare(`
        SELECT type, COUNT(*) as count
        FROM devices 
        WHERE user_id = ?
        GROUP BY type
      `)
      .bind(userId)
      .all()
    
    // 房间分布
    const roomDistribution = await env.DB
      .prepare(`
        SELECT room, COUNT(*) as count
        FROM devices 
        WHERE user_id = ? AND room IS NOT NULL
        GROUP BY room
      `)
      .bind(userId)
      .all()
    
    return jsonResponse({
      period,
      start,
      end: now,
      devices: {
        total: deviceStats?.total || 0,
        online: deviceStats?.online || 0,
        offline: deviceStats?.offline || 0
      },
      scenes: {
        executions: sceneStats?.total_executions || 0
      },
      distribution: {
        byType: typeDistribution.results || [],
        byRoom: roomDistribution.results || []
      }
    })
    
  } catch (err) {
    console.error('Get statistics error:', err)
    return jsonError('Failed to get statistics', 500)
  }
}
