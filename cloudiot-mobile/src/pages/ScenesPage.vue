<template>
  <div class="min-h-screen bg-surface">
    <!-- 顶部导航 -->
    <header class="sticky top-0 bg-surface/95 backdrop-blur border-b border-surface-elevated/50 px-5 py-4 flex items-center justify-between">
      <button @click="$router.back()" class="text-text-primary text-2xl">‹</button>
      <span class="text-text-primary font-semibold">智能场景</span>
      <button @click="createScene" class="text-brand text-2xl">+</button>
    </header>

    <!-- 统计 -->
    <div class="px-5 py-4 flex items-center justify-center gap-8">
      <div class="text-center">
        <div class="text-text-primary text-2xl font-bold">{{ scenes.length }}</div>
        <div class="text-text-muted text-xs">全部场景</div>
      </div>
      <div class="w-px h-8 bg-surface-elevated"></div>
      <div class="text-center">
        <div class="text-brand text-2xl font-bold">{{ activeCount }}</div>
        <div class="text-text-muted text-xs">已启用</div>
      </div>
    </div>

    <!-- 快捷场景 -->
    <div class="px-5 pb-4">
      <div class="text-text-muted text-xs uppercase tracking-wider mb-3">快捷场景</div>
      <div class="grid grid-cols-2 gap-3">
        <div 
          v-for="scene in quickScenes" 
          :key="scene.id"
          class="rounded-2xl p-4 cursor-pointer active:scale-95 transition-transform"
          :style="{ background: scene.bgGradient }"
          @click="triggerScene(scene)"
        >
          <div class="text-3xl mb-2">{{ scene.icon }}</div>
          <div class="text-white font-semibold text-sm">{{ scene.name }}</div>
          <div class="text-white/80 text-xs mt-1">{{ scene.description }}</div>
        </div>
      </div>
    </div>

    <!-- 全部场景 -->
    <div class="px-5 pb-8">
      <div class="text-text-muted text-xs uppercase tracking-wider mb-3">全部场景</div>
      <div class="space-y-3">
        <div 
          v-for="scene in scenes" 
          :key="scene.id"
          class="bg-surface-card rounded-2xl p-4 flex items-center justify-between"
        >
          <div class="flex items-center gap-3 flex-1 cursor-pointer" @click="triggerScene(scene)">
            <div 
              class="w-11 h-11 rounded-xl flex items-center justify-center"
              :style="{ background: scene.color + '20' }"
            >
              <span class="text-xl">{{ scene.icon }}</span>
            </div>
            <div>
              <div class="text-text-primary font-medium">{{ scene.name }}</div>
              <div class="text-text-muted text-xs mt-0.5">{{ scene.description || '暂无描述' }}</div>
            </div>
          </div>
          <div class="flex flex-col items-end gap-1">
            <button
              @click="toggleScene(scene)"
              class="w-12 h-7 rounded-full relative transition-colors"
              :class="scene.enabled ? 'bg-brand' : 'bg-surface-elevated'"
            >
              <span 
                class="absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform"
                :class="scene.enabled ? 'left-6' : 'left-1'"
              ></span>
            </button>
            <span class="text-[10px]" :class="scene.enabled ? 'text-brand' : 'text-text-muted'">
              {{ scene.enabled ? '已启用' : '已禁用' }}
            </span>
          </div>
        </div>

        <div v-if="scenes.length === 0" class="text-center py-12">
          <div class="text-5xl mb-3">🎭</div>
          <div class="text-text-muted mb-4">暂无场景</div>
          <button @click="createScene" class="px-6 py-2 bg-brand text-surface rounded-full text-sm font-medium">
            创建第一个场景
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Scene {
  id: string
  name: string
  description?: string
  icon: string
  color: string
  bgGradient?: string
  enabled: boolean
}

const scenes = ref<Scene[]>([
  { id: '1', name: '早安模式', description: '自动开灯+播放音乐', icon: '🌅', color: '#FF9800', bgGradient: 'linear-gradient(135deg, #FF9800 0%, #FFB74D 100%)', enabled: true },
  { id: '2', name: '离家模式', description: '关闭所有设备+启动安防', icon: '🚗', color: '#4CAF50', bgGradient: 'linear-gradient(135deg, #4CAF50 0%, #81C784 100%)', enabled: true },
  { id: '3', name: '观影模式', description: '调暗灯光+关闭窗帘', icon: '🎬', color: '#9C27B0', bgGradient: 'linear-gradient(135deg, #9C27B0 0%, #CE93D8 100%)', enabled: false },
  { id: '4', name: '睡眠模式', description: '关闭所有灯光', icon: '🌙', color: '#3F51B5', bgGradient: 'linear-gradient(135deg, #3F51B5 0%, #7986CB 100%)', enabled: true },
])

const quickScenes = computed(() => scenes.value.filter(s => s.enabled).slice(0, 4))
const activeCount = computed(() => scenes.value.filter(s => s.enabled).length)

function triggerScene(scene: Scene) {
  showToast(`「${scene.name}」已执行`)
}

function toggleScene(scene: Scene) {
  scene.enabled = !scene.enabled
  showToast(scene.enabled ? '场景已启用' : '场景已禁用')
}

function createScene() {
  showToast('创建场景功能开发中')
}

function showToast(message: string) {
  const toast = document.createElement('div')
  toast.className = 'fixed top-20 left-1/2 -translate-x-1/2 bg-surface-elevated text-text-primary px-6 py-3 rounded-xl shadow-lg z-50 text-sm font-medium'
  toast.textContent = message
  document.body.appendChild(toast)
  setTimeout(() => {
    toast.style.opacity = '0'
    toast.style.transition = 'opacity 0.3s'
    setTimeout(() => toast.remove(), 300)
  }, 2000)
}
</script>
