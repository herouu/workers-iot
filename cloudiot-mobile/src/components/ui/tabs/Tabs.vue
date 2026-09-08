<template>
  <div :class="$props.class">
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  class?: string
}>()
</script>
