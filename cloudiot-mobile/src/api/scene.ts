// 场景 API - 统一 Cloud / Local 调用
import { apiRequest } from './adapter'

export interface Scene {
  id: string
  name: string
  description?: string
  icon?: string
  color?: string
  enabled: boolean
  conditions?: SceneCondition[]
  actions?: SceneAction[]
  createdAt?: string
  updatedAt?: string
  condition?: any
  action?: any
}

export interface SceneCondition {
  type: 'time' | 'device' | 'location'
  config: Record<string, any>
}

export interface SceneAction {
  deviceId: string
  command: string
  params?: Record<string, any>
  delay?: number
}

export const getScenes = (): Promise<Scene[]> => {
  return apiRequest<Scene[]>('/api/v1/scenes')
}

export const getScene = (id: string): Promise<Scene> => {
  return apiRequest<Scene>(`/api/v1/scenes/${id}`)
}

export const createScene = (data: Partial<Scene>): Promise<Scene> => {
  return apiRequest<Scene>('/api/v1/scenes', {
    method: 'POST',
    body: data,
  })
}

export const updateScene = (id: string, data: Partial<Scene>): Promise<Scene> => {
  return apiRequest<Scene>(`/api/v1/scenes/${id}`, {
    method: 'PUT',
    body: data,
  })
}

export const deleteScene = (id: string): Promise<any> => {
  return apiRequest(`/api/v1/scenes/${id}`, {
    method: 'DELETE',
  })
}

export const triggerScene = (id: string): Promise<any> => {
  return apiRequest(`/api/v1/scenes/${id}/trigger`, {
    method: 'POST',
  })
}
