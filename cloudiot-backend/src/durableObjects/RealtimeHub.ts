/**
 * 实时通信 Durable Object
 * 用于管理 App/Web 客户端的 WebSocket 连接和设备状态推送
 */
export class RealtimeHub implements DurableObject {
  private state: DurableObjectState
  private clients: Map<WebSocket, { userId?: string; subscriptions: Set<string> }> = new Map()
  private deviceStates: Map<string, any> = new Map()

  constructor(state: DurableObjectState, env: Env) {
    this.state = state
    
    // 从存储加载设备状态
    state.storage.get('deviceStates').then((saved) => {
      if (saved) {
        this.deviceStates = new Map(Object.entries(saved))
      }
    })
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    
    // WebSocket 连接
    if (url.pathname === '/ws') {
      return this.handleWebSocket(request)
    }
    
    // HTTP 接口
    if (request.method === 'GET' && url.pathname === '/state') {
      // 获取所有设备状态
      return new Response(JSON.stringify({
        states: Object.fromEntries(this.deviceStates)
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    if (request.method === 'POST' && url.pathname === '/broadcast') {
      // 广播消息给订阅者
      const body = await request.json()
      const { deviceId, event, data } = body
      await this.broadcast(deviceId, { event, data, timestamp: Date.now() })
      return new Response(JSON.stringify({ success: true }))
    }
    
    return new Response('RealtimeHub OK', { status: 200 })
  }

  private async handleWebSocket(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const token = url.searchParams.get('token')
    
    // 验证 token (简单验证，生产环境应该用 JWT)
    if (!token) {
      return new Response('Unauthorized', { status: 401 })
    }
    
    // 从 token 中提取 userId (简化版)
    const userId = this.extractUserId(token)
    
    const { 0: client, 1: server } = new WebSocketPair()
    
    // 注册客户端
    this.clients.set(client, {
      userId,
      subscriptions: new Set(['*']) // 订阅所有设备更新
    })
    
    // 发送连接成功消息
    client.send(JSON.stringify({
      type: 'connected',
      userId,
      timestamp: Date.now()
    }))
    
    // 监听关闭
    client.addEventListener('close', () => {
      this.clients.delete(client)
    })
    
    // 监听消息
    client.addEventListener('message', (event) => {
      this.handleClientMessage(client, event.data)
    })
    
    return new Response(null, { webSocket: server })
  }

  private async handleClientMessage(client: WebSocket, data: string): Promise<void> {
    try {
      const message = JSON.parse(data)
      
      const clientInfo = this.clients.get(client)
      if (!clientInfo) return
      
      switch (message.type) {
        case 'ping':
          client.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }))
          break
          
        case 'subscribe':
          // 订阅特定设备
          if (message.deviceId) {
            clientInfo.subscriptions.add(message.deviceId)
          }
          client.send(JSON.stringify({
            type: 'subscribed',
            deviceIds: Array.from(clientInfo.subscriptions)
          }))
          break
          
        case 'unsubscribe':
          // 取消订阅
          if (message.deviceId) {
            clientInfo.subscriptions.delete(message.deviceId)
          }
          break
          
        case 'get_states':
          // 获取所有设备状态
          client.send(JSON.stringify({
            type: 'states',
            states: Object.fromEntries(this.deviceStates)
          }))
          break
          
        case 'get_device_state':
          // 获取单个设备状态
          const state = this.deviceStates.get(message.deviceId)
          client.send(JSON.stringify({
            type: 'device_state',
            deviceId: message.deviceId,
            state: state || null
          }))
          break
          
        default:
          console.log('Unknown message type:', message.type)
      }
    } catch (err) {
      console.error('Failed to handle message:', err)
    }
  }

  // 广播消息给订阅者
  async broadcast(deviceId: string | '*', message: any): Promise<void> {
    const data = JSON.stringify({
      type: 'device_update',
      deviceId,
      ...message
    })
    
    for (const [client, info] of this.clients.entries()) {
      // 检查是否订阅了该设备
      const subscribed = info.subscriptions.has('*') || info.subscriptions.has(deviceId)
      if (subscribed) {
        try {
          client.send(data)
        } catch (err) {
          console.error('Failed to send to client:', err)
          this.clients.delete(client)
        }
      }
    }
  }

  // 更新设备状态
  async updateDeviceState(deviceId: string, state: any): Promise<void> {
    this.deviceStates.set(deviceId, {
      ...state,
      updatedAt: Date.now()
    })
    
    // 持久化
    await this.state.storage.put('deviceStates', Object.fromEntries(this.deviceStates))
    
    // 广播给订阅者
    await this.broadcast(deviceId, {
      event: 'state_changed',
      state: this.deviceStates.get(deviceId)
    })
  }

  private extractUserId(token: string): string {
    // 简化版：实际应该验证 JWT
    try {
      // 假设 token 格式: base64(userId)
      return atob(token)
    } catch {
      return 'anonymous'
    }
  }
}

interface DurableObject {
  fetch(request: Request): Promise<Response>
}

interface DurableObjectState {
  id: DurableObjectId
  storage: {
    get<T>(key: string): Promise<T | undefined>
    put<T>(key: string, value: T): Promise<void>
    delete(key: string): Promise<void>
  }
}

interface DurableObjectId {
  name: string
}

interface Env {
  DB: D1Database
  REALTIME_HUB: DurableObjectNamespace
}
