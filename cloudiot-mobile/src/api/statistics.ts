import { request } from './request'

export interface StatisticsData {
  period: string
  devices: {
    total: number
    online: number
    offline: number
  }
  scenes: {
    executions: number
  }
  distribution: {
    byType: Array<{ type: string; count: number }>
    byRoom: Array<{ room: string; count: number }>
  }
}

export const getStatistics = (period: 'day' | 'week' | 'month' = 'day') => {
  return request<StatisticsData>('/api/v1/data/stats', { params: { period } })
}
