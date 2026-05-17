<template>
  <div 
    class="bg-white rounded-xl p-4 shadow-sm"
    @click="$emit('click')"
  >
    <div class="flex items-center justify-between mb-2">
      <span :class="['w-2 h-2 rounded-full', device.online ? 'bg-green-500' : 'bg-gray-400']"></span>
      <span class="text-xs text-gray-500">{{ device.online ? '在线' : '离线' }}</span>
    </div>
    
    <div class="text-center py-3">
      <div class="text-3xl mb-2">{{ getDeviceIcon(device.type) }}</div>
      <div class="text-sm font-medium truncate">{{ device.name }}</div>
      <div class="text-xs text-gray-500 mt-1">{{ device.room || '未分组' }}</div>
    </div>
    
    <van-button 
      :type="device.state?.power ? 'primary' : 'default'"
      size="small"
      block
      :disabled="!device.online"
      @click.stop="$emit('toggle', device)"
    >
      {{ device.state?.power ? '关闭' : '开启' }}
    </van-button>
  </div>
</template>

<script setup lang="ts">
interface Device {
  id: string
  name: string
  type: string
  room?: string
  online: boolean
  state?: {
    power?: boolean
    [key: string]: any
  }
}

interface Props {
  device: Device
}

defineProps<Props>()

defineEmits<{
  (e: 'click'): void
  (e: 'toggle', device: Device): void
}>()

function getDeviceIcon(type: string): string {
  const icons: Record<string, string> = {
    light: '💡',
    switch: '🔌',
    sensor: '🌡️',
    camera: '📷',
    thermostat: '🌡️',
    lock: '🔒',
    outlet: '🔌',
    generic: '📱'
  }
  return icons[type] || '📱'
}
</script>
