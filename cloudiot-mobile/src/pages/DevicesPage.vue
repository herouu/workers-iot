<template>
  <div class="min-h-screen bg-gray-50 pb-20">
    <!-- 顶部导航 -->
    <div class="bg-white px-4 pt-12 pb-4">
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-bold">我的设备</h1>
        <van-button size="small" type="primary" @click="$router.push('/devices/add')">
          添加
        </van-button>
      </div>
      
      <!-- 筛选标签 -->
      <div class="flex gap-2 mt-4 overflow-x-auto">
        <van-tag 
          :type="activeFilter === 'all' ? 'primary' : 'default'"
          @click="activeFilter = 'all'"
        >
          全部 ({{ devices.length }})
        </van-tag>
        <van-tag 
          :type="activeFilter === 'online' ? 'success' : 'default'"
          @click="activeFilter = 'online'"
        >
          在线 ({{ onlineCount }})
        </van-tag>
        <van-tag 
          :type="activeFilter === 'offline' ? 'default' : 'default'"
          @click="activeFilter = 'offline'"
        >
          离线 ({{ offlineCount }})
        </van-tag>
      </div>
    </div>

    <!-- 设备列表 -->
    <div class="px-4 pt-4">
      <van-empty v-if="filteredDevices.length === 0" description="暂无设备" />
      
      <div v-else class="grid grid-cols-2 gap-3">
        <DeviceCard 
          v-for="device in filteredDevices"
          :key="device.id"
          :device="device"
          @click="$router.push(`/devices/${device.id}`)"
          @toggle="handleDeviceToggle"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { DeviceCard } from '@/components/DeviceCard.vue'
import type { Device } from '@/types'

const activeFilter = ref('all')
const devices = ref<Device[]>([])

const filteredDevices = computed(() => {
  if (activeFilter.value === 'online') {
    return devices.value.filter(d => d.online)
  } else if (activeFilter.value === 'offline') {
    return devices.value.filter(d => !d.online)
  }
  return devices.value
})

const onlineCount = computed(() => devices.value.filter(d => d.online).length)
const offlineCount = computed(() => devices.value.filter(d => !d.online).length)

function handleDeviceToggle(device: Device) {
  // 处理设备切换
}
</script>
