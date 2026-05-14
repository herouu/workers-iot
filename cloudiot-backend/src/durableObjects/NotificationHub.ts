/**
 * 通知中心 Durable Object
 * 用于管理用户通知的实时推送
 */
export class NotificationHub implements DurableObject {
  private state: DurableObjectState
  private clients: Map<string, WebSocket> = new Map()
  private userId: string
  private notificationQueue: any[] = []

  constructor(state: DurableObjectState, env: Env) {
    this.state = state
    this.userId = state.id.name
    
    // 加载未发送的通知
    state.storage.get('queue').then((queue) => {
      if (queue) {
        this.notificationQueue = queue
      }
    })
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    
    if (url.pathname === '/ws') {
      const clientId = url.searchParams.get('clientId') || crypto.randomUUID()
      
      const { 0: client, 1: server } = new WebSocketPair()
      this.clients.set(clientId, client)
      
      // 发送欢迎消息
      client.send(JSON.stringify({
        type: 'connected',
        userId: this.userId,
        clientId,
        timestamp: Date.now()
      }))
      
      // 发送队列中的通知
      if (this.notificationQueue.length > 0) {
        this.notificationQueue.forEach(notification => {
          client.send(JSON.stringify(notification))
        })
        this.notificationQueue = []
        await this.state.storage.put('queue', this.notificationQueue)
      }
      
      // 监听关闭
      client.addEventListener('close', () => {
        this.clients.delete(clientId)
      })
      
      return new Response(null, { webSocket: server })
    }
    
    // HTTP 接口
    if (request.method === 'POST') {
      const body = await request.json()
      return this.sendNotification(body)
    }
    
    return new Response('Notification Hub OK', { status: 200 })
  }

  // 发送通知
  async sendNotification(notification: any): Promise<Response> {
    const message = {
      type: 'notification',
      id: crypto.randomUUID(),
      ...notification,
      timestamp: Date.now()
    }
    
    if (this.clients.size > 0) {
      // 有在线客户端，直接推送
      this.clients.forEach((client) => {
        try {
          client.send(JSON.stringify(message))
        } catch (err) {
          console.error('Failed to send notification:', err)
        }
      })
    } else {
      // 无在线客户端，加入队列
      this.notificationQueue.push(message)
      await this.state.storage.put('queue', this.notificationQueue)
    }
    
    return new Response(JSON.stringify({ success: true, message }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // 广播消息给所有连接的客户端
  async broadcast(message: any): Promise<void> {
    const data = JSON.stringify(message)
    
    this.clients.forEach((client) => {
      try {
        client.send(data)
      } catch (err) {
        console.error('Failed to broadcast:', err)
      }
    })
  }
}

interface DurableObject {
  fetch(request: Request): Promise<Response>
}

interface DurableObjectState {
  id: { name: string }
  storage: {
    get<T>(key: string): Promise<T | undefined>
    put<T>(key: string, value: T): Promise<void>
  }
}
