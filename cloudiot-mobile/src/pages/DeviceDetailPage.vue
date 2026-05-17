<template>
  <div class="device-detail-page">
    <van-nav-bar
      title="设备详情"
      left-arrow
      @click-left="onBack"
      :right-text="device.status === 'online' ? '在线' : '离线'"
    />

    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <div class="content">
        <!-- 设备信息卡片 -->
        <van-cell-group title="设备信息">
          <van-cell title="设备名称" :value="device.name" />
          <van-cell title="设备 ID" :value="device.id" />
          <van-cell title="设备类型" :value="device.type" />
          <van-cell title="位置" :value="device.location || '未设置'" />
          <van-cell title="最后更新" :value="formatTime(device.lastUpdate)" />
        </van-cell-group>

        <!-- 实时数据 -->
        <van-cell-group title="实时数据" v-if="device.data">
          <van-cell
            v-for="(value, key) in device.data"
            :key="key"
            :title="formatKey(key)"
            :value="value"
          />
        </van-cell-group>

        <!-- 控制面板 -->
        <van-cell-group title="控制面板">
          <div class="control-buttons">
            <van-button
              v-for="control in controls"
              :key="control.key"
              type="primary"
              size="small"
              @click="sendCommand(control.key)"
            >
              {{ control.label }}
            </van-button>
          </div>
        </van-cell-group>

        <!-- 历史数据 -->
        <van-cell-group title="历史数据">
          <van-tabs v-model:active="activeTab" @change="onTabChange">
            <van-tab title="24小时" name="24h" />
            <van-tab title="7天" name="7d" />
            <van-tab title="30天" name="30d" />
          </van-tabs>
          <div class="chart-container" v-if="chartData.length > 0">
            <van-empty description="暂无数据" v-if="chartData.length === 0" />
          </div>
        </van-cell-group>
      </div>
    </van-pull-refresh>

    <van-loading vertical v-if="loading">加载中...</van-loading>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import { getDevice, getDeviceHistory, controlDevice } from '@/api/device'

const route = useRoute()
const router = useRouter()

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
const refreshing = ref(false)
const activeTab = ref('24h')
const chartData = ref<any[]>([])

const controls = [
  { key: 'power', label: '开关' },
  { key: 'mode', label: '模式' },
  { key: 'fan', label: '风速' }
]

let refreshInterval: number | null = null

const onBack = () => {
  router.back()
}

const formatTime = (time: string | null) => {
  if (!time) return '未知'
  return new Date(time).toLocaleString('zh-CN')
}

const formatKey = (key: string) => {
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

const onRefresh = async () => {
  await fetchDevice()
  await fetchHistory()
  refreshing.value = false
  showToast('刷新成功')
}

const onTabChange = () => {
  fetchHistory()
}

onMounted(async () => {
  loading.value = true
  await fetchDevice()
  await fetchHistory()
  loading.value = false

  // 每 30 秒自动刷新
  refreshInterval = window.setInterval(fetchDevice, 30000)
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>

<style scoped>
.device-detail-page {
  min-height: 100vh;
  background: #f7f8fa;
}

.content {
  padding: 12px;
}

.control-buttons {
  display: flex;
  gap: 12px;
  padding: 16px;
  flex-wrap: wrap;
}

.chart-container {
  height: 200px;
  padding: 16px;
}
</style>
