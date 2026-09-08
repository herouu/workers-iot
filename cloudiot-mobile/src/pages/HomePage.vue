<template>
  <div class="min-h-screen bg-surface pb-20">
    <!-- 顶部导航栏 -->
    <header class="sticky top-0 z-50 bg-surface/95 backdrop-blur border-b border-surface-elevated/50">
      <div class="flex items-center justify-between px-5 py-3">
        <div class="relative" ref="menuArea">
          <button 
            @click="showMenu = !showMenu" 
            class="flex items-center justify-center w-10 h-10 rounded-xl bg-surface-card text-text-primary hover:bg-surface-elevated transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
          </button>
          
          <!-- 下拉菜单 -->
          <div 
            v-if="showMenu" 
            class="absolute top-12 left-0 w-48 bg-surface-card rounded-2xl shadow-2xl border border-surface-elevated/50 py-2 z-50"
            @click.self="showMenu = false"
          >
            <button 
              @click="router.push('/statistics'); showMenu = false"
              class="w-full flex items-center gap-3 px-4 py-3 text-text-secondary hover:bg-surface-elevated hover:text-text-primary transition-colors text-sm"
            >
              <span>📊</span> 数据统计
            </button>
            <button 
              @click="router.push('/settings'); showMenu = false"
              class="w-full flex items-center gap-3 px-4 py-3 text-text-secondary hover:bg-surface-elevated hover:text-text-primary transition-colors text-sm"
            >
              <span>⚙️</span> 设置
            </button>
            <div class="h-px bg-surface-elevated/50 my-1 mx-3"></div>
            <button 
              @click="handleLogout(); showMenu = false"
              class="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-surface-elevated transition-colors text-sm"
            >
              <span>🚪</span> 退出登录
            </button>
          </div>
        </div>
        
        <h1 class="text-text-primary text-lg font-semibold">Beach House</h1>
        <Avatar class="w-10 h-10 cursor-pointer" @click="router.push('/settings')">
          <AvatarFallback>{{ userInitials }}</AvatarFallback>
        </Avatar>
      </div>
      
      <!-- 选项卡导航 -->
      <div class="px-5 pb-2">
        <TabsList class="w-full bg-transparent p-0 gap-6 justify-start">
          <TabsTrigger 
            v-for="tab in tabs" 
            :key="tab.id"
            :active="activeTab === tab.id"
            @click="activeTab = tab.id"
          >
            {{ tab.name }}
          </TabsTrigger>
        </TabsList>
      </div>
    </header>

    <!-- 内容区域 -->
    <main class="px-5 py-4 space-y-4">
      <!-- 状态卡片区域 -->
      <section>
        <div class="grid grid-cols-2 gap-3">
          <Card 
            v-for="status in statusCards" 
            :key="status.id"
            class="p-4 flex flex-col items-start gap-2"
          >
            <div class="w-8 h-8 rounded-lg bg-surface-elevated/50 flex items-center justify-center text-text-primary">
              <span class="text-base">{{ status.icon }}</span>
            </div>
            <span class="text-text-primary text-lg font-medium">{{ status.value }}</span>
            <span class="text-text-secondary text-xs">{{ status.label }}</span>
          </Card>
        </div>
      </section>

      <!-- 设备卡片区域 -->
      <section>
        <h2 class="text-text-primary text-base font-semibold mb-3">设备</h2>
        <div class="grid grid-cols-2 gap-3">
          <Card 
            v-for="device in devices" 
            :key="device.id"
            class="p-4 flex flex-col gap-3"
          >
            <div class="flex items-center justify-between">
              <div 
                class="w-10 h-10 rounded-xl flex items-center justify-center"
                :class="device.online ? 'bg-brand/10 text-brand' : 'bg-surface-elevated text-text-muted'"
              >
                <span class="text-xl">{{ getDeviceIcon(device.type) }}</span>
              </div>
              <Switch 
                v-model="device.state" 
                :disabled="!device.online"
              />
            </div>
            <div>
              <div class="text-text-primary text-sm font-medium">{{ device.name }}</div>
              <div class="text-text-secondary text-xs mt-0.5">{{ device.brand }}</div>
            </div>
          </Card>
        </div>
      </section>
    </main>

    <!-- 底部导航栏 -->
    <nav class="fixed bottom-0 left-0 right-0 h-16 bg-surface border-t border-surface-elevated/50 flex items-center justify-around px-8 safe-area-pb">
      <button 
        @click="router.push('/settings')"
        class="flex flex-col items-center gap-1 text-text-muted hover:text-text-primary transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
        <span class="text-[10px]">设置</span>
      </button>
      <button 
        @click="router.push('/home')"
        class="flex flex-col items-center gap-1 text-brand"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="0"><path d="M12 2.1L1 12h3v9h7v-6h2v6h7v-9h3L12 2.1zm0 2.691l6 5.4V19h-3v-6H9v6H6v-8.809l6-5.4z"/></svg>
        <span class="text-[10px]">主页</span>
      </button>
      <button 
        @click="router.push('/statistics')"
        class="flex flex-col items-center gap-1 text-text-muted hover:text-text-primary transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
        <span class="text-[10px]">统计</span>
      </button>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import Card from '@/components/ui/card/Card.vue'
import Switch from '@/components/ui/switch/Switch.vue'
import TabsList from '@/components/ui/tabs/TabsList.vue'
import TabsTrigger from '@/components/ui/tabs/TabsTrigger.vue'
import Avatar from '@/components/ui/avatar/Avatar.vue'
import AvatarFallback from '@/components/ui/avatar/AvatarFallback.vue'

const authStore = useAuthStore()

const router = useRouter()
const showMenu = ref(false)
const menuArea = ref<HTMLElement | null>(null)

// 点击菜单区域外关闭下拉菜单
function handleClickOutside(e: MouseEvent) {
  if (showMenu.value && menuArea.value && !menuArea.value.contains(e.target as Node)) {
    showMenu.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})

const user = computed(() => authStore.user)

const userInitials = computed(() => {
  const name = user.value?.name || user.value?.email || 'U'
  return name.charAt(0).toUpperCase()
})

const activeTab = ref('all')

const tabs = [
  { id: 'all', name: 'All' },
  { id: 'living', name: 'Living Room' },
  { id: 'kitchen', name: 'Kitchen' },
  { id: 'bathroom', name: 'Bathroom' },
]

const statusCards = ref([
  { id: 'temp', icon: '🌡️', value: '24°C', label: 'Temperature' },
  { id: 'humidity', icon: '💧', value: '68%', label: 'Humidity' },
  { id: 'energy', icon: '⚡', value: '128W', label: 'Energy Usage' },
  { id: 'light', icon: '☀️', value: '420lm', label: 'Light intensity' },
])

const devices = ref([
  { id: '1', name: 'Light', type: 'light', brand: 'Philips hue', online: true, state: true },
  { id: '2', name: 'Air Conditioner', type: 'ac', brand: 'LG S3', online: true, state: false },
  { id: '3', name: 'Speaker', type: 'speaker', brand: 'LG A1', online: true, state: false },
  { id: '4', name: 'Router', type: 'router', brand: 'D-link 422', online: false, state: false },
])

const getDeviceIcon = (type: string) => {
  const icons: Record<string, string> = {
    light: '💡',
    switch: '🔌',
    sensor: '🌡️',
    camera: '📷',
    thermostat: '❄️',
    lock: '🔒',
    outlet: '🔋',
    ac: '🌬️',
    fan: '🌀',
    speaker: '🔊',
    router: '📡',
    generic: '📱'
  }
  return icons[type] || '📱'
}

function handleLogout() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  router.replace('/login')
}
</script>

<style scoped>
.safe-area-pb {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
