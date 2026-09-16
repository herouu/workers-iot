/**
 * 设备认证中间件
 * 校验设备 JWT（role=device），写入上下文 deviceId
 */
import type { MiddlewareHandler } from 'hono'
import { verifyToken } from '../utils/jwt'
import { unauthorized } from '../utils/response'

export const deviceAuthMiddleware: MiddlewareHandler = async (c, next) => {
  try {
    const authHeader = c.req.header('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return unauthorized('Missing or invalid authorization header')
    }

    const token = authHeader.substring(7)
    const payload = await verifyToken(token, c.env.JWT_SECRET)

    if (!payload || (payload as any).role !== 'device') {
      return unauthorized('Invalid device token')
    }

    c.set('deviceId', payload.sub as string)

    await next()
  } catch (err) {
    console.error('Device auth error:', err)
    return unauthorized('Authentication failed')
  }
}
