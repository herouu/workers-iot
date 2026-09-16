// 本地 mDNS 网关发现插件封装（原生侧插件名固定为 LocalMdns，仅 Android 可用）
import { Capacitor, registerPlugin } from '@capacitor/core'

// 单个 mDNS 服务描述（对应原生 serviceFound 事件 payload）
export interface MdnsServiceInfo {
  name: string
  host: string
  port: number
  serviceType: string
  gatewayId?: string
  mqttPort?: number
  txt?: Record<string, string>
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

  // 按服务名去重
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

// 将 mDNS 服务转换为可直接访问的 HTTP base URL
export function mdnsServiceToUrl(service: MdnsServiceInfo): string {
  return `http://${service.host}:${service.port}`.replace(/\/+$/, '')
}
