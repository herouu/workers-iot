/**
 * 设备认证处理器：device_id + secret 换短时 JWT
 */
import { jsonError, jsonResponse, unauthorized } from '../utils/response'
import { hashDeviceSecret } from '../utils/password'
import { generateDeviceToken } from '../utils/jwt'

export async function handleDeviceAuth(request: Request, env: Env): Promise<Response> {
  try {
    const body: any = await request.json()
    const { device_id, secret } = body

    if (!device_id || !secret) {
      return jsonError('device_id and secret are required', 400)
    }

    const device = await env.DB
      .prepare('SELECT id, secret_hash, secret_salt FROM devices WHERE id = ?')
      .bind(device_id)
      .first()

    if (!device || !device.secret_hash || !device.secret_salt) {
      return unauthorized('Device not registered or secret not configured')
    }

    const secretHash = await hashDeviceSecret(secret, device.secret_salt as string)
    if (secretHash !== device.secret_hash) {
      return unauthorized('Invalid device credentials')
    }

    const token = await generateDeviceToken(device_id, env.JWT_SECRET)
    return jsonResponse({ token, expires_in: 3600 })
  } catch (err) {
    console.error('Device auth error:', err)
    return jsonError('Internal server error', 500)
  }
}
