// API 适配器 - 统一 Cloud / Local 两种后端差异
import { useConnectionStore } from '../stores/connection'

/**
 * 根据当前连接模式翻译 API 路径和请求体。
 *
 * Cloud (Worker)            →  Local Gateway
 * ─────────────────────────────────────────────
 * /api/v1/devices            →  /api/devices
 * /api/v1/devices/:id        →  /api/devices/:id
 * /api/v1/devices/:id/control → /api/devices/:id/command
 * /api/v1/data/devices/:id   →  /api/telemetry/:deviceId
 * /api/v1/scenes             →  /api/rules
 * /api/v1/scenes/:id/trigger →  /api/rules/:id/toggle (近似)
 * /api/v1/data/stats         →  /api/admin/status
 * /api/v1/auth/*             →  (本地无鉴权)
 */

interface AdapterRequest {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  body?: any
  params?: Record<string, string>
  headers?: Record<string, string>
  requiresAuth?: boolean
}

// 路径翻译表: cloud 路径 → local 路径
const PATH_TRANSLATIONS: Array<{ regex: RegExp; replace: (m: RegExpMatchArray) => string }> = [
  { regex: /^\/api\/v1\/devices\/([^/]+)\/control$/, replace: (m) => `/api/devices/${m[1]}/command` },
  { regex: /^\/api\/v1\/data\/devices\/([^/]+)$/, replace: (m) => `/api/telemetry/${m[1]}` },
  { regex: /^\/api\/v1\/data\/devices\/([^/]+)\/stats$/, replace: (m) => `/api/devices/${m[1]}` },
  { regex: /^\/api\/v1\/devices\/([^/]+)$/, replace: (m) => `/api/devices/${m[1]}` },
  { regex: /^\/api\/v1\/devices$/, replace: () => '/api/devices' },
  { regex: /^\/api\/v1\/scenes\/([^/]+)\/trigger$/, replace: (m) => `/api/devices/${m[1]}/command` },
  { regex: /^\/api\/v1\/scenes\/([^/]+)$/, replace: (m) => `/api/rules/${m[1]}` },
  { regex: /^\/api\/v1\/scenes$/, replace: () => '/api/rules' },
  { regex: /^\/api\/v1\/data\/stats$/, replace: () => '/api/admin/status' },
]

function translatePath(cloudPath: string): string {
  for (const t of PATH_TRANSLATIONS) {
    const m = cloudPath.match(t.regex)
    if (m) return t.replace(m)
  }
  // 默认去掉 /v1
  return cloudPath.replace('/api/v1/', '/api/')
}

// 响应格式适配：local → cloud 格式
function adaptResponse(cloudPath: string, localData: any): any {
  // 设备列表：local 返回 { devices, total }，cloud 返回 Device[]
  if (/^\/api\/v1\/devices$/.test(cloudPath)) {
    if (Array.isArray(localData?.devices)) return localData.devices
    if (Array.isArray(localData)) return localData
    return []
  }

  // 设备详情
  if (/^\/api\/v1\/devices\/[^/]+$/.test(cloudPath) && !cloudPath.includes('control')) {
    if (localData?.device) return localData.device
    return localData
  }

  // 设备历史 → cloud 返回数组，local 返回 { data, total }
  if (/^\/api\/v1\/data\/devices\/[^/]+$/.test(cloudPath)) {
    if (Array.isArray(localData?.data)) return localData.data
    if (Array.isArray(localData)) return localData
    return []
  }

  // 规则/场景列表
  if (/^\/api\/v1\/scenes$/.test(cloudPath)) {
    const rules = localData?.rules || localData || []
    return rules.map((r: any) => ({
      id: r.id,
      name: r.name,
      enabled: r.enabled === 1,
      condition: typeof r.condition === 'string' ? JSON.parse(r.condition) : r.condition,
      action: typeof r.action === 'string' ? JSON.parse(r.action) : r.action,
    }))
  }

  return localData
}

// 请求体适配
function adaptBody(cloudPath: string, body: any): any {
  if (!body) return body

  // control → command
  if (cloudPath.endsWith('/control') || cloudPath.includes('/control')) {
    return { command: body.command, params: body.params }
  }

  return body
}

/**
 * 统一的 API 请求入口。
 *
 * @param cloudPath 原始 cloud 格式的路径（如 /api/v1/devices）
 * @param options 请求选项
 * @param options.requiresAuth 是否强制需要鉴权（默认 cloud 模式需要）
 */
export async function apiRequest<T = any>(
  cloudPath: string,
  options: AdapterRequest = {}
): Promise<T> {
  const conn = useConnectionStore()
  const { method = 'GET', body, params, headers = {} } = options

  // 路径
  const path = conn.isLocal ? translatePath(cloudPath) : cloudPath

  // Base URL
  const base = conn.apiBaseUrl
  let fullUrl = `${base}${path}`
  if (params) {
    const sp = new URLSearchParams(params)
    fullUrl += `?${sp.toString()}`

    // local 模式追加 query 到已翻译路径
    if (conn.isLocal && Object.keys(params).length > 0 && !path.includes('?')) {
      // 已处理
    }
  }

  // Headers
  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  }

  // 鉴权（cloud 模式 + 非匿名接口）
  const needsAuth = options.requiresAuth !== false && conn.requiresAuth
  if (needsAuth) {
    const token = localStorage.getItem('accessToken')
    if (token) reqHeaders['Authorization'] = `Bearer ${token}`
  }

  // Body
  const finalBody = conn.isLocal ? adaptBody(cloudPath, body) : body

  // 发送
  const resp = await fetch(fullUrl, {
    method,
    headers: reqHeaders,
    body: finalBody ? JSON.stringify(finalBody) : undefined,
  })

  // 解析
  const ct = resp.headers.get('content-type')
  let rawData: any
  if (ct?.includes('application/json')) {
    rawData = await resp.json()
  } else {
    rawData = await resp.text()
  }

  if (!resp.ok) {
    const msg = rawData?.message || rawData?.error || `请求失败 (${resp.status})`
    const err: any = new Error(msg)
    err.status = resp.status
    err.data = rawData
    throw err
  }

  // 适配响应格式
  return conn.isLocal ? adaptResponse(cloudPath, rawData) : rawData
}
