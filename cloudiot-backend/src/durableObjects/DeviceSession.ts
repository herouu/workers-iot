/**
 * 设备会话 Durable Object
 * 用于维护设备与客户端之间的实时 WebSocket 连接
 */
export class DeviceSession implements DurableObject {
  private state: DurableObjectState
  private clients: WebSocket[] = []
  private deviceId: string
  private latestState: any = {}

  constructor(state: DurableObjectState, env: Env) {
    this.state = state
    this.deviceId = state.id.name
    
    // 从存储加载最新状态
    state.storage.get('latestState').then((saved) => {
      if (saved) {
        this.latestState = saved
      }
    })
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    
    if (url.pathname === '/ws') {
      // WebSocket 连接
      const { 0: client, 1: server } = new WebSocketPair()
      this.clients.push(client)
      
      // 发送欢迎消息和当前状态
      client.send(JSON.stringify({
        type: 'connected',
        deviceId: this.deviceId,
        state: this.latestState,
        timestamp: Date.now()
      }))
      
      // 监听关闭事件
      client.addEventListener('close', () => {
        this.clients = this.clients.filter(c => c !== client)
      })
      
      // 监听消息
      client.addEventListener('message', (event) => {
        this.handleClientMessage(event.data)
      })
      
      return new Response(null, { webSocket: server })
    }
    
    // HTTP 接口
    if (request.method === 'GET') {
      return new Response(JSON.stringify({
        deviceId: this.deviceId,
        state: this.latestState,
        clients: this.clients.length
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    return new Response('Device Session OK', { status: 200 })
  }

  // 发送命令到设备
  async sendCommand(cmd: { command: string; params?: any; timestamp: number }): Promise<void> {
    const message = JSON.stringify({
      type: 'command',
      ...cmd
    })
    
    this.clients.forEach(client => {
      try {
        client.send(message)
      } catch (err) {
        console.error('Failed to send to client:', err)
      }
    })
    
    // 如果有 MQTT 集成，可以在这里发送命令到设备
    // await this.sendToMqtt(cmd)
  }

  // 更新设备状态
  async updateState(newState: any): Promise<void> {
    this.latestState = {
      ...this.latestState,
      ...newState,
      updatedAt: Date.now()
    }
    
    // 持久化状态
    await this.state.storage.put('latestState', this.latestState)
    
    // 广播状态更新给所有客户端
    const message = JSON.stringify({
      type: 'state_update',
      deviceId: this.deviceId,
      state: this.latestState,
      timestamp: Date.now()
    })
    
    this.clients.forEach(client => {
      try {
        client.send(message)
      } catch (err) {
        console.error('Failed to send state update:', err)
      }
    })
  }

  // 处理来自客户端的消息
  private handleClientMessage(data: string): void {
    try {
      const message = JSON.parse(data)
      
      switch (message.type) {
        case 'ping':
          // 心跳响应
          this.clients.forEach(client => {
            client.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }))
          })
          break
          
        case 'state_update':
          // 设备状态更新
          this.updateState(message.state)
          break
          
        default:
          console.log('Unknown message type:', message.type)
      }
    } catch (err) {
      console.error('Failed to handle client message:', err)
    }
  }
}

// 类型声明
interface DurableObject {
  fetch(request: Request): Promise<Response>
}

interface DurableObjectState {
  id: { name: string }
  storage: {
    get<T>(key: string): Promise<T | undefined>
    put<T>(key: string, value: T): Promise<void>
    delete(key: string): Promise<void>
  }
}

interface Env {
  DB: D1Database
  MQTT?: any
}
