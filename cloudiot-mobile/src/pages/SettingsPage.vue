<template>
  <div class="min-h-screen bg-surface">
    <!-- 顶部导航 -->
    <div class="bg-surface px-5 pt-4 pb-6 border-b border-surface-elevated/50">
      <div class="flex items-center">
        <button @click="$router.back()" class="text-text-primary inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-surface-elevated transition-colors">
          <ArrowLeft :size="20" />
        </button>
        <div class="flex-1 text-center text-text-primary text-lg font-semibold">设置</div>
        <div class="w-10 h-10 rounded-full bg-surface-elevated border-2 border-brand flex items-center justify-center">
          <span class="text-sm font-semibold text-brand">U</span>
        </div>
      </div>
    </div>

    <!-- 设置选项 -->
    <div class="px-5 py-4 space-y-4">
      <div class="text-text-muted text-xs uppercase tracking-wider">通用设置</div>
      <div class="bg-surface-card rounded-2xl overflow-hidden">
        <div class="flex items-center justify-between px-4 py-4 cursor-pointer hover:bg-surface-elevated/50 transition-colors" @click="$router.push('/settings/connection')">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center text-brand">
              <Wifi :size="18" />
            </div>
            <span class="text-text-primary">连接设置</span>
          </div>
          <span class="text-text-muted">›</span>
        </div>
        <div class="h-px bg-surface-elevated/50 mx-4"></div>
        <div class="flex items-center justify-between px-4 py-4 cursor-pointer hover:bg-surface-elevated/50 transition-colors" @click="$router.push('/settings/profile')">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center text-brand">
              <User :size="18" />
            </div>
            <span class="text-text-primary">账号信息</span>
          </div>
          <span class="text-text-muted">›</span>
        </div>
        <div class="h-px bg-surface-elevated/50 mx-4"></div>
        <div class="flex items-center justify-between px-4 py-4 cursor-pointer hover:bg-surface-elevated/50 transition-colors" @click="handleUpdate">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center text-brand">
              <RefreshCw :size="18" />
            </div>
            <span class="text-text-primary">检查更新</span>
          </div>
          <span class="text-text-muted text-sm">v1.0.0</span>
        </div>
      </div>

      <div class="text-text-muted text-xs uppercase tracking-wider">其他</div>
      <div class="bg-surface-card rounded-2xl overflow-hidden">
        <div class="flex items-center justify-between px-4 py-4 cursor-pointer hover:bg-surface-elevated/50 transition-colors" @click="handleAbout">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center text-brand">
              <Info :size="18" />
            </div>
            <span class="text-text-primary">关于我们</span>
          </div>
          <span class="text-text-muted">›</span>
        </div>
      </div>

      <!-- 退出登录 -->
      <button 
        @click="handleLogout"
        class="w-full h-12 mt-6 bg-red-600/10 hover:bg-red-600/20 text-red-500 font-medium rounded-xl transition-colors"
      >
        退出登录
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { User, RefreshCw, Info, ArrowLeft, Wifi } from 'lucide-vue-next'

const router = useRouter()

function handleAbout() {
  showToast('Workers IoT 智能家居管理系统 v1.0.0')
}

function handleUpdate() {
  showToast('已是最新版本')
}

function handleLogout() {
  if (confirm('确定要退出登录吗?')) {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    router.replace('/login')
  }
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
