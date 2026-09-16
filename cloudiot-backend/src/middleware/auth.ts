/**
 * 认证中间件
 *
 * 说明：Workers 运行时的 Request.headers 是不可变的，
 * 因此不能像传统 Node 中间件那样通过写请求头传递用户信息，
 * 改用 Hono 的 c.set() 将用户信息挂到请求上下文（Variables）。
 */
import type { MiddlewareHandler } from 'hono'
import { verifyToken } from '../utils/jwt'
import { unauthorized } from '../utils/response'

/**
 * Bearer Token 认证中间件
 * 校验通过后写入上下文：userId / userEmail
 */
export const authMiddleware: MiddlewareHandler = async (c, next) => {
  try {
    const authHeader = c.req.header('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return unauthorized('Missing or invalid authorization header')
    }

    const token = authHeader.substring(7)
    const payload = await verifyToken(token, c.env.JWT_SECRET)

    if (!payload) {
      return unauthorized('Invalid or expired token')
    }

    // 写入 Hono 上下文，避免操作不可变的 request.headers
    c.set('userId', payload.sub)
    c.set('userEmail', payload.email)

    await next()
  } catch (err) {
    console.error('Auth error:', err)
    return unauthorized('Authentication failed')
  }
}
