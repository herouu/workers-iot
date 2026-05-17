// 移动端类型定义

export interface User {
  id: string
  email: string
  name?: string
  avatar?: string
}

export interface Device {
  id: string
  name: string
  type: string
  location?: string
  online: boolean
  status?: 'on' | 'off'
  favorite?: boolean
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
