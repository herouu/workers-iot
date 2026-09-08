<template>
  <button
    :class="cn(
      'inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
      active ? 'bg-surface-elevated text-text-primary shadow-sm border-b-2 border-brand' : 'text-text-secondary hover:text-text-primary'
    )"
    @click="$emit('click')"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
import { cn } from '@/lib/utils'

defineProps<{
  active?: boolean
  class?: string
}>()

defineEmits<{
  (e: 'click'): void
}>()
</script>
