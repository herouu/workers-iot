<template>
  <div class="min-h-screen bg-gray-50 pb-20">
    <!-- 顶部状态栏 -->
    <div class="bg-blue-500 text-white px-4 pt-12 pb-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-bold">CloudIoT</h1>
          <p class="text-sm opacity-80 mt-1">智能生活，尽在掌控</p>
        </div>
        <div class="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
          <span class="text-lg">{{ userInitials }}</span>
        </div>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="px-4 -mt-4">
      <!-- 设备概览卡片 -->
      <div class="bg-white rounded-xl p-4 shadow-sm mb-4">
        <h2 class="text-base font-medium mb-3">设备概览</h2>
        <div class="grid grid-cols-3 gap-4 text-center">
          <div>
            <div class="text-2xl font-bold text-green-500">{{ onlineCount }}</div>
            <div class="text-xs text-gray-500">在线</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-gray-400">{{ offlineCount }}</div>
            <div class="text-xs text-gray-500">离线</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-blue-500">{{ totalCount }}</div>
            <div class="text-xs text-gray-500">总计</div>
          </div>
        </div>
      </div>

      <!-- 快捷操作 -->
      <div class="bg-white rounded-xl p-4 shadow-sm mb-4">
        <h2 class="text-base font-medium mb-3">快捷操作</h2>
        <div class="grid grid-cols-4 gap-3">
          <button 
            v-for="action in quickActions"
            :key="action.label"
            class="flex flex-col items-center p-2 rounded-lg hover:bg-gray-100"
            @click="handleQuickAction(action.action)"
          >
            <div class="text-2xl mb-1">{{ action.icon }}</div>
            <span class="text-xs text-gray-600">{{ action.label }}</span>
          </button>
        </div>
      </div>

      <!-- 设备列表 -->
      <div class="mb-4">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-base font-medium">我的设备</h2>
          <button class="text-blue-500 text-sm" @click="$router.push('/devices')">
            查看全部
          </button>
        </div>
        
        <van-empty v-if="devices.length === 0" description="暂无设备">
          <van-button round type="primary" @click="$router.push('/devices/add')">
            添加设备
          </van-button>
        </van-empty>
        
        <div v-else class="grid grid-cols-2 gap-3">
          <DeviceCard 
            v-for="device in devices.slice(0, 4)"
            :key="device.id"
            :device="device"
            @click="$router.push(`/devices/${device.id}`)"
            @toggle="handleDeviceToggle"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { DeviceCard } from '@/components/DeviceCard.vue'
import type { Device } from '@/types'

const router = useRouter()

const devices = ref<Device[]>([])
const loading = ref(false)

const userInitials = computed(() => '👤')

const onlineCount = computed(() => devices.value.filter(d => d.online).length)
const offlineCount = computed(() => devices.value.filter(d => !d.online).length)
const totalCount = computed(() => devices.value.length)

const quickActions = [
  { icon: '💡', label: '开灯', action: 'all_on' },
  { icon: '🔌', label: '关灯', action: 'all_off' },
  { icon: '🎬', label: '场景', action: 'scene' },
  { icon: '➕', label: '添加', action: 'add' }
]

onMounted(() => {
  // 加载设备数据
})

function handleQuickAction(action: string) {
  switch (action) {
    case 'all_on':
      // 批量开灯
      break
    case 'all_off':
      // 批量关灯
      break
    case 'scene':
      router.push('/scenes')
      break
    case 'add':
      router.push('/devices/add')
      break
  }
}

function handleDeviceToggle(device: Device) {
  // 切换设备状态
}
</script>
