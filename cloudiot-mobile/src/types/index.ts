// 移动端类型定义

export interface User {
  id: string
  email: string
  name?: string
  avatar?: string
}

export interface Device {
  id: string
  user_id: string
  name: string
  type: string
  model?: string
  room?: string
  icon: string
  online: boolean
  state: DeviceState
  created_at: number
}

export interface DeviceState {
  power?: boolean
  brightness?: number
  color?: string
  temperature?: number
  [key: string]: any
}

export interface Scene {
  id: string
  name: string
  icon: string
  enabled: boolean
  actions: any[]
}
