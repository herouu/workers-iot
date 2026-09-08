<template>
  <div class="min-h-screen bg-surface">
    <!-- 顶部导航 -->
    <header class="sticky top-0 bg-surface/95 backdrop-blur border-b border-surface-elevated/50 px-5 py-4 flex items-center justify-between">
      <button @click="router.back()" class="text-text-primary text-2xl">‹</button>
      <span class="text-text-primary font-semibold">设备详情</span>
      <div class="flex items-center gap-2">
        <span :class="conn.isLocal ? 'text-brand' : 'text-text-muted'" class="text-xs font-mono" :title="conn.apiBaseUrl">
          {{ conn.isLocal ? '📡本地' : '☁️云' }}
        </span>
        <span :class="device.status === 'online' ? 'text-brand' : 'text-text-muted'" class="text-sm">
          {{ device.status === 'online' ? '在线' : '离线' }}
        </span>
      </div>
    </header>

    <!-- 加载状态 -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="animate-spin w-8 h-8 border-3 border-brand border-t-transparent rounded-full"></div>
    </div>

    <div v-else class="px-5 py-4 space-y-4">
      <!-- 设备信息 -->
      <div class="bg-surface-card rounded-2xl overflow-hidden">
        <div class="px-4 py-3 border-b border-surface-elevated/50">
          <span class="text-text-muted text-xs uppercase tracking-wider">设备信息</span>
        </div>
        <div class="divide-y divide-surface-elevated/50">
          <div class="flex items-center justify-between px-4 py-3">
            <span class="text-text-secondary">设备名称</span>
            <span class="text-text-primary">{{ device.name }}</span>
          </div>
          <div class="flex items-center justify-between px-4 py-3">
            <span class="text-text-secondary">设备 ID</span>
            <span class="text-text-primary text-sm font-mono">{{ device.id }}</span>
          </div>
          <div class="flex items-center justify-between px-4 py-3">
            <span class="text-text-secondary">设备类型</span>
            <span class="text-text-primary">{{ device.type }}</span>
          </div>
          <div class="flex items-center justify-between px-4 py-3">
            <span class="text-text-secondary">位置</span>
            <span class="text-text-primary">{{ device.location || '未设置' }}</span>
          </div>
          <div class="flex items-center justify-between px-4 py-3">
            <span class="text-text-secondary">最后更新</span>
            <span class="text-text-primary text-sm">{{ formatTime(device.lastUpdate) }}</span>
          </div>
        </div>
      </div>

      <!-- 实时数据 -->
      <div v-if="device.data" class="bg-surface-card rounded-2xl overflow-hidden">
        <div class="px-4 py-3 border-b border-surface-elevated/50">
          <span class="text-text-muted text-xs uppercase tracking-wider">实时数据</span>
        </div>
        <div class="divide-y divide-surface-elevated/50">
          <div 
            v-for="(value, key) in device.data" 
            :key="key"
            class="flex items-center justify-between px-4 py-3"
          >
            <span class="text-text-secondary">{{ formatKey(key) }}</span>
            <span class="text-text-primary">{{ value }}</span>
          </div>
        </div>
      </div>

      <!-- 控制面板 -->
      <div class="bg-surface-card rounded-2xl overflow-hidden">
        <div class="px-4 py-3 border-b border-surface-elevated/50">
          <span class="text-text-muted text-xs uppercase tracking-wider">控制面板</span>
        </div>
        <div class="p-4 flex flex-wrap gap-2">
          <button 
            v-for="control in controls" 
            :key="control.key"
            @click="sendCommand(control.key)"
            class="px-4 py-2 bg-brand/10 text-brand rounded-xl text-sm font-medium hover:bg-brand/20 transition-colors"
          >
            {{ control.label }}
          </button>
        </div>
      </div>

      <!-- 历史数据 -->
      <div class="bg-surface-card rounded-2xl overflow-hidden">
        <div class="px-4 py-3 border-b border-surface-elevated/50">
          <span class="text-text-muted text-xs uppercase tracking-wider">历史数据</span>
        </div>
        <div class="flex gap-2 p-4">
          <button 
            v-for="tab in ['24h', '7d', '30d']" 
            :key="tab"
            @click="activeTab = tab; onTabChange()"
            class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            :class="activeTab === tab ? 'bg-surface-elevated text-text-primary' : 'text-text-muted hover:text-text-primary'"
          >
            {{ tab === '24h' ? '24小时' : tab === '7d' ? '7天' : '30天' }}
          </button>
        </div>
        <div class="px-4 pb-4">
          <div v-if="chartData.length === 0" class="text-center py-8 text-text-muted">
            暂无数据
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getDevice, getDeviceHistory, controlDevice } from '@/api/device'
import { useConnectionStore } from '@/stores/connection'

const route = useRoute()
const router = useRouter()
const conn = useConnectionStore()

const deviceId = ref(route.params.id as string)
const device = ref<any>({
  id: '',
  name: '',
  type: '',
  location: '',
  status: 'offline',
  lastUpdate: null,
  data: null
})
const loading = ref(false)
const activeTab = ref('24h')
const chartData = ref<any[]>([])

const controls = [
  { key: 'power', label: '开关' },
  { key: 'mode', label: '模式' },
  { key: 'fan', label: '风速' }
]

let refreshInterval: number | null = null

const formatTime = (time: string | null) => {
  if (!time) return '未知'
  return new Date(time).toLocaleString('zh-CN')
}

const formatKey = (key: string | number) => {
  const keyMap: Record<string, string> = {
    temperature: '温度',
    humidity: '湿度',
    power: '功率',
    voltage: '电压'
  }
  return keyMap[key] || key
}

const fetchDevice = async () => {
  try {
    const data = await getDevice(deviceId.value)
    device.value = data
  } catch (error: any) {
    showToast(error.message || '获取设备信息失败')
  }
}

const fetchHistory = async () => {
  try {
    const data = await getDeviceHistory(deviceId.value, activeTab.value)
    chartData.value = data || []
  } catch (error: any) {
    console.error('获取历史数据失败', error)
  }
}

const sendCommand = async (command: string) => {
  try {
    await controlDevice(deviceId.value, { command })
    showToast('命令已发送')
    await fetchDevice()
  } catch (error: any) {
    showToast(error.message || '发送命令失败')
  }
}

const onTabChange = () => {
  fetchHistory()
}

onMounted(async () => {
  loading.value = true
  await fetchDevice()
  await fetchHistory()
  loading.value = false

  refreshInterval = window.setInterval(fetchDevice, 30000)
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})

function showToast(message: string) {
  const toast = document.createElement('div')
  toast.className = 'fixed top-20 left-1/2 -translate-x-1/2 bg-surface-elevated text-text-primary px-6 py-3 rounded-xl shadow-lg z-50 text-sm font-medium'
  toast.textContent = message
  document.body.appendChild(toast)
  setTimeout(() => {
    toast.style.opacity = '0'
    toast.style.transition = 'opacity 0.3s'
    setTimeout(() => toast.remove(), 300)
  }, 2000)
}
</script>
