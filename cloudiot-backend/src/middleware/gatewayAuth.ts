/**
 * 网关鉴权中间件
 *
 * 校验云同步网关携带的静态密钥：
 *   Authorization: Bearer <GATEWAY_API_KEY>
 * 密钥通过环境变量 GATEWAY_API_KEY 配置（开发环境见 wrangler.toml，生产应使用 secret）。
 */
import type { MiddlewareHandler } from 'hono'

export const gatewayAuth: MiddlewareHandler = async (c, next) => {
  const gatewayKey = c.env.GATEWAY_API_KEY

  // 未配置密钥时拒绝服务，避免出现"无鉴权"后门
  if (!gatewayKey) {
    return c.json({ error: 'GATEWAY_API_KEY not configured' }, 503)
  }

  const authHeader = c.req.header('Authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : ''

  if (!token || token !== gatewayKey) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  await next()
}
