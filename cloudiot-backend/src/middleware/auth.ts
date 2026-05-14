/**
 * 认证中间件
 */
import { verifyToken } from '../utils/jwt'
import { unauthorized } from '../utils/response'

export async function withAuth(request: Request, env: Env): Promise<Response | null> {
  const authHeader = request.headers.get('Authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return unauthorized('Missing or invalid authorization header')
  }
  
  const token = authHeader.substring(7)
  
  try {
    const payload = await verifyToken(token, env.JWT_SECRET)
    if (!payload) {
      return unauthorized('Invalid or expired token')
    }
    
    // 将用户信息添加到请求中
    request.headers.set('x-user-id', payload.sub)
    request.headers.set('x-user-email', payload.email)
    
    return null
  } catch (err) {
    console.error('Auth error:', err)
    return unauthorized('Authentication failed')
  }
}
