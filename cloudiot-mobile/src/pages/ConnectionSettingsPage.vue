<template>
  <div class="min-h-screen bg-surface">
    <header class="sticky top-0 bg-surface/95 backdrop-blur border-b border-surface-elevated/50 px-5 py-4 flex items-center justify-between">
      <button @click="router.back()" class="text-text-primary text-2xl">‹</button>
      <span class="text-text-primary font-semibold">连接设置</span>
      <span class="text-text-muted text-sm">v1.0</span>
    </header>

    <div class="px-5 py-4 space-y-4">
      <!-- 当前连接状态 -->
      <div class="bg-surface-card rounded-2xl overflow-hidden">
        <div class="px-4 py-3 border-b border-surface-elevated/50">
          <span class="text-text-muted text-xs uppercase tracking-wider">当前连接</span>
        </div>
        <div class="p-4 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-text-secondary">模式</span>
            <span :class="conn.isLocal ? 'text-brand' : 'text-text-muted'" class="text-sm font-medium">
              {{ conn.isLocal ? '本地网关' : '云端' }}
            </span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-text-secondary">地址</span>
            <span class="text-text-primary text-sm font-mono">{{ conn.apiBaseUrl }}</span>
          </div>
          <div v-if="conn.isLocal && conn.gatewayId" class="flex items-center justify-between">
            <span class="text-text-secondary">网关 ID</span>
            <span class="text-text-primary text-xs font-mono">{{ conn.gatewayId }}</span>
          </div>
          <div v-if="conn.isLocal" class="flex items-center justify-between">
            <span class="text-text-secondary">状态</span>
            <span :class="conn.localAvailable ? 'text-green-500' : 'text-red-500'" class="text-sm">
              {{ conn.localAvailable ? '已连接' : '不可达' }}
            </span>
          </div>
        </div>
      </div>

      <!-- 模式切换 -->
      <div class="bg-surface-card rounded-2xl overflow-hidden">
        <div class="px-4 py-3 border-b border-surface-elevated/50">
          <span class="text-text-muted text-xs uppercase tracking-wider">切换模式</span>
        </div>
        <div class="p-4 space-y-3">
          <button
            @click="handleSwitch('cloud')"
            :disabled="loading"
            class="w-full px-4 py-3 rounded-xl text-sm font-medium transition-colors text-left flex items-center justify-between"
            :class="conn.isCloud ? 'bg-brand/10 text-brand ring-1 ring-brand/30' : 'bg-surface-elevated text-text-secondary'"
          >
            <span>☁️ 云端模式</span>
            <span v-if="conn.isCloud" class="text-brand">✓</span>
          </button>
          <button
            @click="handleSwitch('local')"
            :disabled="loading"
            class="w-full px-4 py-3 rounded-xl text-sm font-medium transition-colors text-left flex items-center justify-between"
            :class="conn.isLocal ? 'bg-brand/10 text-brand ring-1 ring-brand/30' : 'bg-surface-elevated text-text-secondary'"
          >
            <span>📡 本地网关</span>
            <span v-if="conn.isLocal" class="text-brand">✓</span>
          </button>
        </div>
      </div>

      <!-- 本地网关配置 -->
      <div v-if="conn.isLocal || showLocalConfig" class="bg-surface-card rounded-2xl overflow-hidden">
        <div class="px-4 py-3 border-b border-surface-elevated/50">
          <span class="text-text-muted text-xs uppercase tracking-wider">网关地址</span>
        </div>
        <div class="p-4 space-y-3">
          <input
            v-model="localUrl"
            type="text"
            placeholder="http://192.168.1.100:8080"
            class="w-full px-3 py-2 bg-surface-elevated rounded-lg text-text-primary text-sm font-mono placeholder:text-text-muted/50 focus:outline-none focus:ring-1 focus:ring-brand/50"
          />
          <div class="flex gap-2">
            <button
              @click="handleDetect"
              :disabled="loading"
              class="flex-1 px-4 py-2 bg-surface-elevated text-text-secondary rounded-lg text-sm font-medium hover:bg-surface-elevated/80 transition-colors"
            >
              🔍 自动发现
            </button>
            <button
              @click="handleCheck"
              :disabled="loading || !localUrl"
              class="flex-1 px-4 py-2 bg-brand/10 text-brand rounded-lg text-sm font-medium hover:bg-brand/20 transition-colors"
            >
              ✓ 检测
            </button>
          </div>
        </div>
      </div>

      <!-- 提示 -->
      <div class="bg-surface-card rounded-2xl p-4">
        <p class="text-text-muted text-xs leading-relaxed">
          <strong class="text-text-secondary">云端模式：</strong>连接 Cloudflare Worker，需要登录鉴权，支持远程访问。<br>
          <strong class="text-text-secondary">本地网关：</strong>连接局域网内的 IoT 网关（旧手机 + Termux），延迟更低，断网可用。
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useConnectionStore } from '@/stores/connection'

const router = useRouter()
const conn = useConnectionStore()

const localUrl = ref(conn.gatewayUrl)
const showLocalConfig = ref(false)
const loading = ref(false)

onMounted(() => {
  showLocalConfig.value = conn.isLocal
})

async function handleSwitch(mode: 'cloud' | 'local') {
  if (mode === conn.mode) return
  loading.value = true
  try {
    if (mode === 'local') {
      showLocalConfig.value = true
      // 如果已有地址，直接检测
      if (localUrl.value) {
        const ok = await conn.checkLocalGateway(localUrl.value)
        if (ok) {
          conn.setMode('local')
          showToast('已切换到本地网关')
        } else {
          showToast('网关不可达，请检查地址')
        }
      }
    } else {
      conn.setMode('cloud')
      showToast('已切换到云端模式')
    }
  } finally {
    loading.value = false
  }
}

async function handleDetect() {
  loading.value = true
  try {
    const ok = await conn.autoDetect()
    if (ok) {
      localUrl.value = conn.gatewayUrl
      showToast(`发现网关: ${conn.gatewayUrl}`)
    } else {
      showToast('未发现本地网关')
    }
  } finally {
    loading.value = false
  }
}

async function handleCheck() {
  if (!localUrl.value) return
  loading.value = true
  try {
    const ok = await conn.checkLocalGateway(localUrl.value)
    if (ok) {
      conn.setMode('local')
      showToast('已切换到本地网关')
    } else {
      showToast('网关不可达')
    }
  } finally {
    loading.value = false
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
    setTimeout(() => toast.remove(), 3000)
  }, 2000)
}
</script>
