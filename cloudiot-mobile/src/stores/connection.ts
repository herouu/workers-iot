// 连接模式管理 - Cloud / Local Gateway
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type ConnectionMode = 'cloud' | 'local'

interface ConnectionState {
  mode: ConnectionMode
  gatewayUrl: string
  gatewayId: string | null
  lastChecked: number
  localAvailable: boolean
}

const STORAGE_KEY = 'cloudiot-connection'

function loadState(): ConnectionState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return {
    mode: 'cloud',
    gatewayUrl: '',
    gatewayId: null,
    lastChecked: 0,
    localAvailable: false,
  }
}

function saveState(state: ConnectionState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export const useConnectionStore = defineStore('connection', () => {
  const state = ref<ConnectionState>(loadState())

  const mode = computed(() => state.value.mode)
  const isLocal = computed(() => state.value.mode === 'local')
  const isCloud = computed(() => state.value.mode === 'cloud')
  const gatewayUrl = computed(() => state.value.gatewayUrl)
  const gatewayId = computed(() => state.value.gatewayId)
  const localAvailable = computed(() => state.value.localAvailable)

  // 当前生效的 API base URL
  const apiBaseUrl = computed(() => {
    if (state.value.mode === 'local' && state.value.gatewayUrl) {
      return state.value.gatewayUrl.replace(/\/$/, '')
    }
    return (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787').replace(/\/$/, '')
  })

  // 是否需要鉴权（仅 cloud 模式）
  const requiresAuth = computed(() => state.value.mode === 'cloud')

  function setMode(mode: ConnectionMode) {
    state.value.mode = mode
    saveState(state.value)
  }

  function setGatewayUrl(url: string) {
    state.value.gatewayUrl = url.replace(/\/$/, '')
    saveState(state.value)
  }

  function setGatewayInfo(gatewayId: string | null, available: boolean) {
    state.value.gatewayId = gatewayId
    state.value.localAvailable = available
    state.value.lastChecked = Date.now()
    saveState(state.value)
  }

  // 检测本地网关是否可达
  async function checkLocalGateway(url?: string): Promise<boolean> {
    const target = url || state.value.gatewayUrl
    if (!target) return false

    try {
      const resp = await fetch(`${target.replace(/\/$/, '')}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      })
      if (resp.ok) {
        const data = await resp.json()
        setGatewayInfo(data.gateway_id || null, true)
        if (url) setGatewayUrl(url)
        return true
      }
    } catch { /* unreachable */ }

    setGatewayInfo(null, false)
    return false
  }

  // 自动检测：尝试发现本地网关
  async function autoDetect(): Promise<boolean> {
    // 尝试常见本地地址
    const candidates = [
      state.value.gatewayUrl,
      'http://192.168.1.100:8080',
      'http://192.168.0.100:8080',
      'http://10.0.0.1:8080',
    ].filter(Boolean) as string[]

    for (const url of candidates) {
      if (await checkLocalGateway(url)) return true
    }
    return false
  }

  // 切换模式（带自动检测）
  async function switchMode(mode: ConnectionMode): Promise<boolean> {
    if (mode === 'local') {
      const available = await autoDetect()
      if (!available) return false
      setMode('local')
      return true
    }
    setMode('cloud')
    return true
  }

  return {
    mode,
    isLocal,
    isCloud,
    gatewayUrl,
    gatewayId,
    localAvailable,
    apiBaseUrl,
    requiresAuth,
    setMode,
    setGatewayUrl,
    setGatewayInfo,
    checkLocalGateway,
    autoDetect,
    switchMode,
  }
})
