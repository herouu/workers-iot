<template>
  <button
    type="button"
    role="switch"
    :aria-checked="modelValue"
    :class="cn(
      'peer inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
      modelValue ? 'bg-brand' : 'bg-surface-elevated'
    )"
    @click="toggle"
  >
    <span
      :class="cn(
        'pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform',
        modelValue ? 'translate-x-5' : 'translate-x-0.5'
      )"
    />
  </button>
</template>

<script setup lang="ts">
import { cn } from '@/lib/utils'

const props = defineProps<{
  modelValue?: boolean
  class?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

function toggle() {
  emit('update:modelValue', !props.modelValue)
}
</script>
