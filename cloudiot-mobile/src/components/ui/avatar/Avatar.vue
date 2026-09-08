<template>
  <div :class="cn('relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-brand', $props.class)">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { cn } from '@/lib/utils'

defineProps<{
  class?: string
}>()
</script>
