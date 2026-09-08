<template>
  <div :class="cn('rounded-2xl border border-surface-elevated/50 bg-surface-card text-text-primary shadow-lg', $props.class)">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { cn } from '@/lib/utils'

defineProps<{
  class?: string
}>()
</script>
