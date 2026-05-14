/**
 * 设备处理器
 */
import { jsonResponse, jsonError, success, notFound, forbidden } from '../utils/response'
import { generateDeviceId } from '../utils/password'

// 获取用户 ID
function getUserId(request: Request): string {
  return request.headers.get('x-user-id') || ''
}

// 获取设备列表
export async function getDevices(request: Request, env: Env): Promise<Response> {
  try {
    const userId = getUserId(request)
    const url = new URL(request.url)
    const room = url.searchParams.get('room')
    const type = url.searchParams.get('type')
    const online = url.searchParams.get('online')
    
    let query = 'SELECT * FROM devices WHERE user_id = ?'
    const bindings: any[] = [userId]
    
    if (room) {
      query += ' AND room = ?'
      bindings.push(room)
    }
    if (type) {
      query += ' AND type = ?'
      bindings.push(type)
    }
    if (online !== null) {
      query += ' AND online = ?'
      bindings.push(online === 'true' ? 1 : 0)
    }
    
    query += ' ORDER BY created_at DESC'
    
    const result = await env.DB
      .prepare(query)
      .bind(...bindings)
      .all()
    
    const devices = result.results.map((device: any) => ({
      ...device,
      state: JSON.parse(device.state || '{}'),
      config: JSON.parse(device.config || '{}'),
      online: !!device.online
    }))
    
    return jsonResponse({ devices })
    
  } catch (err) {
    console.error('Get devices error:', err)
    return jsonError('Failed to get devices', 500)
  }
}

// 获取设备详情
export async function getDevice(request: Request, env: Env): Promise<Response> {
  try {
    const userId = getUserId(request)
    const deviceId = extractId(request.url)
    
    const device = await env.DB
      .prepare('SELECT * FROM devices WHERE id = ?')
      .bind(deviceId)
      .first()
    
    if (!device) {
      return notFound('Device not found')
    }
    
    // 检查权限
    if (device.user_id !== userId) {
      // 检查是否被分享
      const share = await env.DB
        .prepare('SELECT * FROM device_shares WHERE device_id = ? AND shared_with = ?')
        .bind(deviceId, userId)
        .first()
      
      if (!share) {
        return forbidden('No permission to access this device')
      }
    }
    
    return jsonResponse({
      ...device,
      state: JSON.parse(device.state || '{}'),
      config: JSON.parse(device.config || '{}'),
      online: !!device.online
    })
    
  } catch (err) {
    console.error('Get device error:', err)
    return jsonError('Failed to get device', 500)
  }
}

// 创建设备
export async function createDevice(request: Request, env: Env): Promise<Response> {
  try {
    const userId = getUserId(request)
    const body = await request.json()
    const { name, type, model, room, icon, mac_address } = body
    
    if (!name || !type) {
      return jsonError('Name and type are required', 400)
    }
    
    const deviceId = generateDeviceId()
    
    await env.DB
      .prepare(`
        INSERT INTO devices (id, user_id, name, type, model, room, icon, mac_address)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        deviceId,
        userId,
        name,
        type,
        model || null,
        room || null,
        icon || '📱',
        mac_address || null
      )
      .run()
    
    return jsonResponse({
      id: deviceId,
      name,
      type,
      model,
      room,
      icon: icon || '📱',
      online: false,
      state: {}
    }, 201)
    
  } catch (err) {
    console.error('Create device error:', err)
    return jsonError('Failed to create device', 500)
  }
}

// 更新设备
export async function updateDevice(request: Request, env: Env): Promise<Response> {
  try {
    const userId = getUserId(request)
    const deviceId = extractId(request.url)
    const body = await request.json()
    
    // 检查设备存在和权限
    const device = await env.DB
      .prepare('SELECT * FROM devices WHERE id = ?')
      .bind(deviceId)
      .first()
    
    if (!device) {
      return notFound('Device not found')
    }
    
    if (device.user_id !== userId) {
      return forbidden('No permission to update this device')
    }
    
    // 构建更新语句
    const updates: string[] = []
    const bindings: any[] = []
    
    if (body.name !== undefined) {
      updates.push('name = ?')
      bindings.push(body.name)
    }
    if (body.room !== undefined) {
      updates.push('room = ?')
      bindings.push(body.room)
    }
    if (body.icon !== undefined) {
      updates.push('icon = ?')
      bindings.push(body.icon)
    }
    if (body.config !== undefined) {
      updates.push('config = ?')
      bindings.push(JSON.stringify(body.config))
    }
    
    updates.push('updated_at = ?')
    bindings.push(Date.now())
    bindings.push(deviceId)
    
    await env.DB
      .prepare(`UPDATE devices SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...bindings)
      .run()
    
    return success({ message: 'Device updated successfully' })
    
  } catch (err) {
    console.error('Update device error:', err)
    return jsonError('Failed to update device', 500)
  }
}

// 删除设备
export async function deleteDevice(request: Request, env: Env): Promise<Response> {
  try {
    const userId = getUserId(request)
    const deviceId = extractId(request.url)
    
    const device = await env.DB
      .prepare('SELECT * FROM devices WHERE id = ?')
      .bind(deviceId)
      .first()
    
    if (!device) {
      return notFound('Device not found')
    }
    
    if (device.user_id !== userId) {
      return forbidden('No permission to delete this device')
    }
    
    await env.DB
      .prepare('DELETE FROM devices WHERE id = ?')
      .bind(deviceId)
      .run()
    
    return success({ message: 'Device deleted successfully' })
    
  } catch (err) {
    console.error('Delete device error:', err)
    return jsonError('Failed to delete device', 500)
  }
}

// 控制设备
export async function controlDevice(request: Request, env: Env): Promise<Response> {
  try {
    const userId = getUserId(request)
    const deviceId = extractId(request.url)
    const body = await request.json()
    const { command, params } = body
    
    if (!command) {
      return jsonError('Command is required', 400)
    }
    
    // 检查设备存在和权限
    const device = await env.DB
      .prepare('SELECT * FROM devices WHERE id = ?')
      .bind(deviceId)
      .first()
    
    if (!device) {
      return notFound('Device not found')
    }
    
    if (device.user_id !== userId) {
      return forbidden('No permission to control this device')
    }
    
    // 构建新状态
    const currentState = JSON.parse(device.state || '{}')
    const newState = calculateNewState(currentState, command, params)
    
    // 更新设备状态
    await env.DB
      .prepare('UPDATE devices SET state = ?, updated_at = ? WHERE id = ?')
      .bind(JSON.stringify(newState), Date.now(), deviceId)
      .run()
    
    // 记录状态历史
    await env.DB
      .prepare('INSERT INTO device_states (device_id, state) VALUES (?, ?)')
      .bind(deviceId, JSON.stringify(newState))
      .run()
    
    // 通过 Durable Object 通知设备
    const doId = env.DEVICE_SESSION.idFromName(deviceId)
    const doStub = env.DEVICE_SESSION.get(doId)
    await doStub.sendCommand({ command, params, timestamp: Date.now() })
    
    return jsonResponse({
      success: true,
      deviceId,
      command,
      newState
    })
    
  } catch (err) {
    console.error('Control device error:', err)
    return jsonError('Failed to control device', 500)
  }
}

// 设备配网
export async function provisionDevice(request: Request, env: Env): Promise<Response> {
  try {
    const userId = getUserId(request)
    const body = await request.json()
    const { mac_address, name, type } = body
    
    if (!mac_address) {
      return jsonError('MAC address is required', 400)
    }
    
    // 检查设备是否已存在
    const existing = await env.DB
      .prepare('SELECT * FROM devices WHERE mac_address = ?')
      .bind(mac_address)
      .first()
    
    if (existing) {
      // 设备已存在，关联到当前用户
      if (existing.user_id !== userId) {
        return jsonError('Device already registered to another user', 409)
      }
      return jsonResponse({ device: existing, isNew: false })
    }
    
    // 创建设备
    const deviceId = generateDeviceId()
    await env.DB
      .prepare(`
        INSERT INTO devices (id, user_id, name, type, mac_address, online, state)
        VALUES (?, ?, ?, ?, ?, 1, '{}')
      `)
      .bind(deviceId, userId, name || 'New Device', type || 'generic', mac_address)
      .run()
    
    return jsonResponse({
      id: deviceId,
      name: name || 'New Device',
      type: type || 'generic',
      mac_address,
      online: true
    }, 201)
    
  } catch (err) {
    console.error('Provision device error:', err)
    return jsonError('Failed to provision device', 500)
  }
}

// 获取设备数据
export async function getDeviceData(request: Request, env: Env): Promise<Response> {
  try {
    const userId = getUserId(request)
    const deviceId = extractId(request.url)
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '100')
    
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
    
    const history = await env.DB
      .prepare(`
        SELECT * FROM device_states 
        WHERE device_id = ? 
        ORDER BY timestamp DESC 
        LIMIT ?
      `)
      .bind(deviceId, limit)
      .all()
    
    return jsonResponse({
      device: {
        id: device.id,
        name: device.name,
        currentState: JSON.parse(device.state || '{}')
      },
      history: history.results.map((r: any) => ({
        state: JSON.parse(r.state),
        timestamp: r.timestamp
      }))
    })
    
  } catch (err) {
    console.error('Get device data error:', err)
    return jsonError('Failed to get device data', 500)
  }
}

// 辅助函数：从 URL 提取 ID
function extractId(url: string): string {
  const segments = new URL(url).pathname.split('/')
  return segments[segments.length - 1]
}

// 计算新状态
function calculateNewState(currentState: any, command: string, params?: any): any {
  const newState = { ...currentState }
  
  switch (command) {
    case 'power':
    case 'set_power':
      newState.power = params?.power ?? !currentState.power
      break
    case 'set_brightness':
      newState.brightness = params?.brightness ?? currentState.brightness
      break
    case 'set_color':
      newState.color = params?.color ?? currentState.color
      break
    case 'set_temperature':
      newState.temperature = params?.temperature ?? currentState.temperature
      break
    default:
      newState[command] = params
  }
  
  return newState
}
