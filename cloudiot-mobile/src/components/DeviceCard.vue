<template>
  <Card class="p-4 flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <div 
        class="w-12 h-12 rounded-xl flex items-center justify-center"
        :class="device.online ? 'bg-brand/10 text-brand' : 'bg-surface-elevated text-text-muted'"
      >
        <span class="text-2xl">{{ getDeviceIcon(device.type) }}</span>
      </div>
      <Switch 
        :model-value="device.state?.power" 
        @update:model-value="$emit('toggle', device)"
        :disabled="!device.online"
      />
    </div>
    
    <div>
      <div class="text-text-primary text-sm font-semibold truncate">{{ device.name }}</div>
      <div class="text-text-secondary text-xs mt-0.5">{{ device.room || '未分组' }}</div>
    </div>
  </Card>
</template>

<script setup lang="ts">
import Card from '@/components/ui/card/Card.vue'
import Switch from '@/components/ui/switch/Switch.vue'

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
    ac: '🌬️',
    fan: '🌀',
    speaker: '🔊',
    router: '📡',
    generic: '📱'
  }
  return icons[type] || '📱'
}
</script>
