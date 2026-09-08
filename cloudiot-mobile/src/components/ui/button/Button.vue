<template>
  <button :class="cn(
    'inline-flex items-center justify-center rounded-xl text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
    variantStyles[variant],
    sizeStyles[size],
    $props.class
  )">
    <slot />
  </button>
</template>

<script setup lang="ts">
import { cn } from '@/lib/utils'

withDefaults(defineProps<{
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  class?: string
}>(), {
  variant: 'default',
  size: 'default',
})

const variantStyles: Record<string, string> = {
  default: 'bg-brand text-surface hover:bg-brand-dark',
  destructive: 'bg-red-600 text-white hover:bg-red-700',
  outline: 'border border-surface-elevated bg-transparent hover:bg-surface-elevated text-text-primary',
  secondary: 'bg-surface-elevated text-text-primary hover:bg-surface-elevated/80',
  ghost: 'hover:bg-surface-elevated text-text-primary',
  link: 'text-brand underline-offset-4 hover:underline',
}

const sizeStyles: Record<string, string> = {
  default: 'h-10 px-4 py-2',
  sm: 'h-8 px-3 text-xs',
  lg: 'h-12 px-8',
  icon: 'h-10 w-10',
}
</script>
