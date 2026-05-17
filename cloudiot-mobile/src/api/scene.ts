import { request } from './request'

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

export const getScenes = () => {
  return request<Scene[]>('/api/v1/scenes')
}

export const getScene = (id: string) => {
  return request<Scene>(`/api/v1/scenes/${id}`)
}

export const createScene = (data: Partial<Scene>) => {
  return request<Scene>('/api/v1/scenes', {
    method: 'POST',
    body: data
  })
}

export const updateScene = (id: string, data: Partial<Scene>) => {
  return request<Scene>(`/api/v1/scenes/${id}`, {
    method: 'PUT',
    body: data
  })
}

export const deleteScene = (id: string) => {
  return request(`/api/v1/scenes/${id}`, {
    method: 'DELETE'
  })
}

export const triggerScene = (id: string) => {
  return request(`/api/v1/scenes/${id}/trigger`, {
    method: 'POST'
  })
}
