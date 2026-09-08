<template>
  <div :class="cn('flex h-full w-full items-center justify-center rounded-full bg-surface-elevated text-text-primary font-semibold', $props.class)">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { cn } from '@/lib/utils'

defineProps<{
  class?: string
}>()
</script>
