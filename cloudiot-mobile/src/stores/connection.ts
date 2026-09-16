// 连接模式管理 - Cloud / Local Gateway
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { CapacitorHttp } from '@capacitor/core'
import { scanGatewaysMdns, isNativeMdnsAvailable, getNativeLocalIps, aggregateGatewayServices } from '../plugins/localMdns'

export type ConnectionMode = 'cloud' | 'local'

export interface DiscoveredGateway {
  url: string
  gatewayId: string | null
}

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

// 心跳：本地模式失联自动降级到云端
let heartbeatTimer: number | null = null
let heartbeatFailCount = 0
const HEARTBEAT_INTERVAL = 15000
const HEARTBEAT_MAX_FAIL = 2

// 局域网扫描整体时限（避免多网段拖死等待）
const SCAN_DEADLINE = 8000
const IP_TIMEOUT = 600

// 获取本机局域网 IPv4 列表（原生插件优先，WebView 内 WebRTC ICE 不可靠）
async function getLocalIPv4s(): Promise<string[]> {
  // 1. Android 原生枚举本机网卡（含热点/多网卡）
  const native = await getNativeLocalIps()
  if (native.length) return native

  // 2. WebRTC ICE 兜底（Web / iOS）
  const ip = await new Promise<string | null>((resolve) => {
    try {
      const pc = new RTCPeerConnection({ iceServers: [] })
      pc.createDataChannel('probe')
      pc.onicecandidate = (e) => {
        if (!e.candidate) { pc.close(); resolve(null); return }
        const m = /([0-9]{1,3}(?:\.[0-9]{1,3}){3})/.exec(e.candidate.candidate)
        if (m) {
          const ip = m[1]
          if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
            pc.close(); resolve(ip); return
          }
        }
      }
      pc.createOffer().then((o) => pc.setLocalDescription(o)).catch(() => resolve(null))
      setTimeout(() => { pc.close(); resolve(null) }, 1000)
    } catch { resolve(null) }
  })
  return ip ? [ip] : []
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

  // 云端 API base URL（local 模式下自动回落使用）
  const cloudApiBaseUrl = computed(() =>
    (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787').replace(/\/$/, '')
  )

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

  // 检测本地网关是否可达（使用 native HTTP 绕过 WebView Mixed Content 限制）
  async function checkLocalGateway(url?: string): Promise<boolean> {
    const target = url || state.value.gatewayUrl
    if (!target) return false

    try {
      // CapacitorHttp 走 native HTTP 栈，不受 WebView Mixed Content 策略限制
      const resp = await CapacitorHttp.get({
        url: `${target.replace(/\/$/, '')}/health`,
        connectTimeout: 3000,
        readTimeout: 3000,
      })
      if (resp.status >= 200 && resp.status < 300) {
        const data = typeof resp.data === 'string' ? JSON.parse(resp.data) : resp.data
        setGatewayInfo(data.gateway_id || null, true)
        if (url) setGatewayUrl(url)
        return true
      }
    } catch { /* unreachable */ }

    setGatewayInfo(null, false)
    return false
  }

  // 并发扫描本机网段 + 常见网段，发现本地网关
  async function scanLocalNetwork(
    options: { port?: number; includeSaved?: boolean } = {}
  ): Promise<DiscoveredGateway[]> {
    const port = options.port ?? 8080
    const includeSaved = options.includeSaved ?? true

    const segments: string[] = []
    const addSegment = (seg: string) => {
      if (seg && !segments.includes(seg) && segments.length < 5) segments.push(seg)
    }

    // 1. 本机网段（原生枚举优先，覆盖热点/多网卡场景）
    const localIPs = await getLocalIPv4s()
    for (const localIP of localIPs) addSegment(localIP.replace(/\.\d+$/, '.'))

    // 2. 已存网关地址的网段
    if (includeSaved && state.value.gatewayUrl) {
      const m = /^https?:\/\/([0-9]{1,3}(?:\.[0-9]{1,3}){3})/.exec(state.value.gatewayUrl)
      if (m) addSegment(m[1].replace(/\.\d+$/, '.'))
    }

    // 3. 兜底常见网段
    addSegment('192.168.1.')
    addSegment('192.168.0.')
    addSegment('10.0.0.')

    const candidates: Array<{ base: string; healthUrl: string }> = []
    for (const seg of segments) {
      for (let i = 1; i <= 254; i++) {
        const base = `http://${seg}${i}:${port}`
        candidates.push({ base, healthUrl: `${base}/health` })
      }
    }

    const found: DiscoveredGateway[] = []
    const startedAt = Date.now()
    let index = 0
    // 并发 16：到整体时限即收尾，已发现结果立即返回
    // 使用 CapacitorHttp（native HTTP 栈）绕过 WebView Mixed Content 限制
    await Promise.all(
      Array.from({ length: Math.min(32, candidates.length) }, async () => {
        while (index < candidates.length && Date.now() - startedAt < SCAN_DEADLINE) {
          const c = candidates[index++]
          try {
            const resp = await CapacitorHttp.get({
              url: c.healthUrl,
              connectTimeout: IP_TIMEOUT,
              readTimeout: IP_TIMEOUT,
            })
            if (resp.status >= 200 && resp.status < 300) {
              let gatewayId: string | null = null
              try {
                const data = typeof resp.data === 'string' ? JSON.parse(resp.data) : resp.data
                gatewayId = data?.gateway_id || null
              } catch { /* 非 JSON 忽略 */ }
              found.push({ url: c.base, gatewayId })
            }
          } catch { /* 网络错误/超时静默跳过 */ }
        }
      })
    )

    // 去重（多网段可能扫到同一网关）
    return [...new Map(found.map((g) => [g.url, g])).values()]
  }

  // 通过 DNS-SD/mDNS 发现局域网网关（仅原生 Android 可用）
  // 返回聚合后的网关列表（HTTP + MQTT 多服务合并为一条）
  async function discoverViaMdns(): Promise<DiscoveredGateway[]> {
    if (!isNativeMdnsAvailable()) return []
    try {
      const services = await scanGatewaysMdns()
      const gateways = aggregateGatewayServices(services)
      return gateways.map((g) => ({
        url: g.httpUrl,
        gatewayId: g.gatewayId ?? null,
      }))
    } catch {
      // 静默降级：调用方自行回退到网段扫描
      return []
    }
  }

  // 自动检测：mDNS 优先，网段扫描兜底，选中第一个可达网关
  async function autoDetect(): Promise<boolean> {
    // 1. mDNS 发现（仅原生 Android 生效，Web 下直接返回空）
    try {
      const mdnsGateways = await discoverViaMdns()
      for (const g of mdnsGateways) {
        const ok = await checkLocalGateway(g.url)
        if (ok) return true
      }
    } catch { /* mDNS 失败静默进入网段扫描兜底 */ }

    // 2. 网段暴力扫描兜底
    const found = await scanLocalNetwork()
    for (const g of found) {
      const ok = await checkLocalGateway(g.url)
      if (ok) return true
    }
    return false
  }

  // 心跳：本地模式定时探活，连续失败且云端可达时自动降级
  function startHeartbeat() {
    if (heartbeatTimer !== null) stopHeartbeat()
    heartbeatTimer = window.setInterval(() => {
      void (async () => {
        if (state.value.mode !== 'local' || document.hidden) return
        const ok = await checkLocalGateway()
        if (ok) {
          heartbeatFailCount = 0
          return
        }
        heartbeatFailCount++
        if (heartbeatFailCount >= HEARTBEAT_MAX_FAIL) {
          heartbeatFailCount = 0
          try {
            const r = await fetch(`${cloudApiBaseUrl.value}/health`, {
              signal: AbortSignal.timeout(3000),
            })
            if (r.ok) setMode('cloud')
          } catch { /* 云端也不可达，保持本地标记离线 */ }
        }
      })()
    }, HEARTBEAT_INTERVAL)
  }

  function stopHeartbeat() {
    if (heartbeatTimer !== null) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
    heartbeatFailCount = 0
  }

  // 模式联动心跳
  watch(
    () => state.value.mode,
    (m) => {
      m === 'local' ? startHeartbeat() : stopHeartbeat()
    },
    { immediate: true }
  )

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
    cloudApiBaseUrl,
    requiresAuth,
    setMode,
    setGatewayUrl,
    setGatewayInfo,
    checkLocalGateway,
    autoDetect,
    discoverViaMdns,
    scanLocalNetwork,
    startHeartbeat,
    stopHeartbeat,
    switchMode,
  }
})
