/**
 * 密码加密工具
 */

// 简单的密码哈希函数 (生产环境建议使用 Web Crypto API 或专门的哈希库)
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + 'cloudiot-salt-2024')
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password)
  return passwordHash === hash
}

export function generateUserId(): string {
  const timestamp = Date.now().toString(36)
  const randomPart = crypto.randomUUID().split('-')[0]
  return `user_${timestamp}_${randomPart}`
}

export function generateDeviceId(): string {
  const timestamp = Date.now().toString(36)
  const randomPart = crypto.randomUUID().split('-')[0]
  return `dev_${timestamp}_${randomPart}`
}

export function generateSceneId(): string {
  const timestamp = Date.now().toString(36)
  const randomPart = crypto.randomUUID().split('-')[0]
  return `scene_${timestamp}_${randomPart}`
}
