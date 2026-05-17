import { request } from './request'

export interface Device {
  id: string
  name: string
  type: string
  status: 'online' | 'offline'
  location?: string
  lastUpdate?: string
  data?: Record<string, any>
}

export interface DeviceControl {
  command: string
  params?: Record<string, any>
}

export const getDevices = () => {
  return request<Device[]>('/api/v1/devices')
}

export const getDevice = (id: string) => {
  return request<Device>(`/api/v1/devices/${id}`)
}

export const createDevice = (data: Partial<Device>) => {
  return request<Device>('/api/v1/devices', {
    method: 'POST',
    body: data
  })
}

export const updateDevice = (id: string, data: Partial<Device>) => {
  return request<Device>(`/api/v1/devices/${id}`, {
    method: 'PUT',
    body: data
  })
}

export const deleteDevice = (id: string) => {
  return request(`/api/v1/devices/${id}`, {
    method: 'DELETE'
  })
}

export const controlDevice = (id: string, data: DeviceControl) => {
  return request(`/api/v1/devices/${id}/control`, {
    method: 'POST',
    body: data
  })
}

export const provisionDevice = (serialNumber: string) => {
  return request<Device>('/api/v1/devices/provision', {
    method: 'POST',
    body: { serialNumber }
  })
}

export const getDeviceHistory = (id: string, period: string = '24h') => {
  return request<any[]>(`/api/v1/data/devices/${id}?period=${period}`)
}

export const getDeviceStats = (id: string) => {
  return request<any>(`/api/v1/data/devices/${id}/stats`)
}
