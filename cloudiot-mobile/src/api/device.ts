// 设备 API - 统一 Cloud / Local 调用
import { apiRequest } from './adapter'

export interface Device {
  id: string
  name: string
  type: string
  status: 'online' | 'offline'
  location?: string
  lastUpdate?: string
  data?: Record<string, any>
  online?: number
  protocol?: string
  last_seen?: number | null
  config?: string | null
  created_at?: number
}

export interface DeviceControl {
  command: string
  params?: Record<string, any>
}

export const getDevices = (): Promise<Device[]> => {
  return apiRequest<Device[]>('/api/v1/devices')
}

export const getDevice = (id: string): Promise<Device> => {
  return apiRequest<Device>(`/api/v1/devices/${id}`)
}

export const createDevice = (data: Partial<Device>): Promise<Device> => {
  return apiRequest<Device>('/api/v1/devices', {
    method: 'POST',
    body: data,
  })
}

export const updateDevice = (id: string, data: Partial<Device>): Promise<Device> => {
  return apiRequest<Device>(`/api/v1/devices/${id}`, {
    method: 'PUT',
    body: data,
  })
}

export const deleteDevice = (id: string): Promise<any> => {
  return apiRequest(`/api/v1/devices/${id}`, {
    method: 'DELETE',
  })
}

export const controlDevice = (id: string, data: DeviceControl): Promise<any> => {
  return apiRequest(`/api/v1/devices/${id}/control`, {
    method: 'POST',
    body: data,
  })
}

export const provisionDevice = (serialNumber: string): Promise<Device> => {
  return apiRequest<Device>('/api/v1/devices/provision', {
    method: 'POST',
    body: { serialNumber },
  })
}

export const getDeviceHistory = (id: string, _period: string = '24h'): Promise<any[]> => {
  return apiRequest<any[]>(`/api/v1/data/devices/${id}`)
}

export const getDeviceStats = (id: string): Promise<any> => {
  return apiRequest<any>(`/api/v1/data/devices/${id}/stats`)
}
