<template>
  <div :class="cn('inline-flex h-12 items-center justify-center rounded-xl bg-surface-card p-1 text-text-muted', $props.class)">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { cn } from '@/lib/utils'

defineProps<{
  class?: string
}>()
</script>
