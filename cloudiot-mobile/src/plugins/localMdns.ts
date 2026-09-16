// 本地 mDNS 网关发现插件封装（原生侧插件名固定为 LocalMdns，仅 Android 可用）
import { Capacitor, registerPlugin } from '@capacitor/core'

// 单个 DNS-SD 服务描述（对应原生 serviceFound 事件 payload）
export interface MdnsServiceInfo {
  name: string
  host: string
  port: number
  serviceType: string
  gatewayId?: string
  mqttPort?: number
  // 增强 TXT 记录（RFC 6763）
  proto?: string      // "http" | "mqtt"
  api?: string        // API 版本路径，如 "/api/v1"
  path?: string       // HTTP 根路径
  url?: string        // 完整 URL（MQTT 服务使用）
  transport?: string  // 传输协议：tcp
  hostname?: string   // 广播方主机名
  version?: string    // 服务版本
  txt?: Record<string, string>
}

// 聚合后的网关信息（合并 HTTP + MQTT 两个服务）
export interface GatewayInfo {
  gatewayId: string
  name: string
  httpUrl: string
  mqttUrl: string
  mqttPort: number
  host: string
  version: string
  proto: string
}

// 发现过程中的错误信息（对应原生 discoveryError 事件 payload）
export interface MdnsError {
  code: string
  message: string
}

// serviceLost 事件 payload
export interface MdnsServiceLostEvent {
  name: string
}

// 监听句柄（与原生 addListener 返回结构一致）
export interface MdnsListenerHandle {
  remove(): Promise<void>
}

// 类型化插件接口，与原生实现契约一一对应
interface LocalMdnsPlugin {
  startDiscovery(): Promise<void>
  stopDiscovery(): Promise<void>
  getServices(): Promise<{ services: MdnsServiceInfo[] }>
  getLocalIpv4s(): Promise<{ ips: string[] }>
  addListener(
    eventName: 'serviceFound',
    listenerFunc: (event: MdnsServiceInfo) => void
  ): Promise<MdnsListenerHandle>
  addListener(
    eventName: 'serviceLost',
    listenerFunc: (event: MdnsServiceLostEvent) => void
  ): Promise<MdnsListenerHandle>
  addListener(
    eventName: 'discoveryError',
    listenerFunc: (event: MdnsError) => void
  ): Promise<MdnsListenerHandle>
}

// 插件对象（Web 环境下为安全的代理对象，方法调用才会失败）
export const LocalMdns = registerPlugin<LocalMdnsPlugin>('LocalMdns')

// 插件是否可用：仅原生 Android 平台支持 mDNS 发现
export function isNativeMdnsAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
}

// 原生获取本机 IPv4 列表（Android 可靠；Web/iOS 无插件时返回空数组，由调用方回退 WebRTC）
export async function getNativeLocalIps(): Promise<string[]> {
  if (!isNativeMdnsAvailable()) return []
  try {
    const { ips } = await LocalMdns.getLocalIpv4s()
    return Array.isArray(ips) ? ips.filter((ip) => typeof ip === 'string') : []
  } catch {
    return []
  }
}

// 扫描局域网网关：注册监听 -> 启动发现 -> 等待窗口 -> 停止并清理
export async function scanGatewaysMdns(timeoutMs = 4000): Promise<MdnsServiceInfo[]> {
  if (!isNativeMdnsAvailable()) return []

  // 按服务名去重（HTTP 与 MQTT 独立广播，各自有唯一服务名）
  const services = new Map<string, MdnsServiceInfo>()
  const handles: MdnsListenerHandle[] = []

  try {
    // 必须先注册监听再启动发现，否则早期事件会丢失
    handles.push(
      await LocalMdns.addListener('serviceFound', (event) => {
        if (!event || !event.name) return
        services.set(event.name, event)
      })
    )

    handles.push(
      await LocalMdns.addListener('serviceLost', (event) => {
        if (event && event.name) services.delete(event.name)
      })
    )

    handles.push(
      await LocalMdns.addListener('discoveryError', (error) => {
        // 静默降级：仅记录错误，不中断扫描
        console.warn('[localMdns] discovery error', error?.code, error?.message)
      })
    )

    await LocalMdns.startDiscovery()

    // 等待发现窗口结束后返回结果
    await new Promise<void>((resolve) => setTimeout(resolve, timeoutMs))
  } catch (error) {
    // 任何异常都不抛出，返回已收集到的结果
    console.warn('[localMdns] scan failed, fallback to segment scan', error)
  } finally {
    try {
      await LocalMdns.stopDiscovery()
    } catch { /* 停止失败忽略 */ }

    for (const handle of handles) {
      try {
        await handle.remove()
      } catch { /* 监听移除失败忽略 */ }
    }
  }

  return Array.from(services.values())
}

/**
 * 将扫描到的多服务按 gatewayId 聚合成网关信息
 * 同一个网关会广播 HTTP + MQTT 两个服务，需合并为一条
 */
export function aggregateGatewayServices(services: MdnsServiceInfo[]): GatewayInfo[] {
  const gateways = new Map<string, Partial<GatewayInfo>>()

  for (const svc of services) {
    const gatewayId = svc.gatewayId || svc.txt?.['gateway_id'] || svc.name
    const existing = gateways.get(gatewayId) || { gatewayId }

    if (svc.proto === 'mqtt' || svc.serviceType?.includes('mqtt')) {
      // MQTT 独立服务
      existing.mqttUrl = svc.url || `mqtt://${svc.host}:${svc.port}`
      existing.mqttPort = svc.port
    } else {
      // HTTP 主服务
      existing.httpUrl = svc.host ? `http://${svc.host}:${svc.port}` : undefined
      existing.name = svc.name
      existing.host = svc.host
      existing.version = svc.version || svc.txt?.['version'] || ''
      existing.proto = svc.proto || svc.txt?.['proto'] || 'http'
      // 兼容旧版：从 HTTP 服务 TXT 读取 mqtt_port
      if (!existing.mqttPort && svc.mqttPort) {
        existing.mqttPort = svc.mqttPort
      }
      if (!existing.mqttUrl && svc.txt?.['mqtt_url']) {
        existing.mqttUrl = svc.txt['mqtt_url']
      }
    }

    // 若只有 MQTT 服务，补全 httpUrl
    if (!existing.httpUrl && existing.host && svc.txt?.['port']) {
      existing.httpUrl = `http://${existing.host}:${svc.txt['port']}`
    }

    gateways.set(gatewayId, existing)
  }

  // 过滤不完整条目（必须有 httpUrl 才算有效网关）
  return Array.from(gateways.values())
    .filter(g => g.httpUrl)
    .map(g => ({
      gatewayId: g.gatewayId!,
      name: g.name || g.gatewayId!,
      httpUrl: g.httpUrl!,
      mqttUrl: g.mqttUrl || `mqtt://${g.host}:${g.mqttPort || 1883}`,
      mqttPort: g.mqttPort || 1883,
      host: g.host || '',
      version: g.version || '',
      proto: g.proto || 'http',
    }))
}

// 将 mDNS 服务转换为可直接访问的 HTTP base URL
export function mdnsServiceToUrl(service: MdnsServiceInfo): string {
  return `http://${service.host}:${service.port}`.replace(/\/+$/, '')
}
