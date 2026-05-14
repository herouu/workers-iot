/**
 * 场景执行器 Durable Object
 * 用于执行复杂的场景联动逻辑
 */
export class SceneExecutor implements DurableObject {
  private state: DurableObjectState
  private sceneId: string
  private isExecuting: boolean = false
  private executionHistory: any[] = []

  constructor(state: DurableObjectState, env: Env) {
    this.state = state
    this.sceneId = state.id.name
  }

  async fetch(request: Request): Promise<Response> {
    if (request.method === 'GET') {
      return new Response(JSON.stringify({
        sceneId: this.sceneId,
        isExecuting: this.isExecuting,
        history: this.executionHistory.slice(-10)
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    return new Response('Scene Executor OK', { status: 200 })
  }

  // 执行动作列表
  async execute(actions: any[]): Promise<any[]> {
    if (this.isExecuting) {
      throw new Error('Scene is already executing')
    }
    
    this.isExecuting = true
    const results: any[] = []
    
    try {
      for (const action of actions) {
        const result = await this.executeAction(action)
        results.push(result)
        
        // 如果动作失败且为关键动作，停止执行
        if (result.success === false && action.critical) {
          break
        }
      }
    } finally {
      this.isExecuting = false
      this.executionHistory.push({
        timestamp: Date.now(),
        actions: actions.length,
        results
      })
      
      // 保留最近 100 条记录
      if (this.executionHistory.length > 100) {
        this.executionHistory = this.executionHistory.slice(-100)
      }
    }
    
    return results
  }

  // 执行单个动作
  private async executeAction(action: any): Promise<any> {
    try {
      switch (action.type) {
        case 'device_control':
          return await this.controlDevice(action)
          
        case 'delay':
          return await this.delay(action)
          
        case 'notification':
          return await this.sendNotification(action)
          
        case 'scene_trigger':
          return await this.triggerScene(action)
          
        default:
          console.warn('Unknown action type:', action.type)
          return { success: true, action: action.type, message: 'Unknown action type' }
      }
    } catch (err: any) {
      return { success: false, action: action.type, error: err.message }
    }
  }

  // 控制设备
  private async controlDevice(action: any): Promise<any> {
    const { deviceId, command, params } = action
    
    // 通过设备控制 API 或 Durable Object 发送命令
    // 这里简化处理，实际应该调用设备控制接口
    console.log(`Executing device control: ${deviceId} -> ${command}`, params)
    
    return {
      success: true,
      action: 'device_control',
      deviceId,
      command,
      params,
      timestamp: Date.now()
    }
  }

  // 延时
  private delay(action: any): Promise<any> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          action: 'delay',
          duration: action.duration,
          timestamp: Date.now()
        })
      }, action.duration || 1000)
    })
  }

  // 发送通知
  private async sendNotification(action: any): Promise<any> {
    console.log('Sending notification:', action)
    
    return {
      success: true,
      action: 'notification',
      title: action.title,
      body: action.body,
      timestamp: Date.now()
    }
  }

  // 触发另一个场景
  private async triggerScene(action: any): Promise<any> {
    console.log('Triggering scene:', action.sceneId)
    
    return {
      success: true,
      action: 'scene_trigger',
      sceneId: action.sceneId,
      timestamp: Date.now()
    }
  }
}

interface DurableObject {
  fetch(request: Request): Promise<Response>
}

interface DurableObjectState {
  id: { name: string }
  storage: any
}

interface Env {
  DB: D1Database
  DEVICE_SESSION: DurableObjectNamespace
  SCENE_EXECUTOR: DurableObjectNamespace
}
