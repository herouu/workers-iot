// 统计 API - 统一 Cloud / Local 调用
import { apiRequest } from './adapter'

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

export const getStatistics = (period: 'day' | 'week' | 'month' = 'day'): Promise<StatisticsData> => {
  return apiRequest<StatisticsData>('/api/v1/data/stats', { params: { period } })
}
