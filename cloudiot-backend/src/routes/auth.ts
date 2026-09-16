/**
 * 认证路由
 */
import { Hono } from 'hono'
import { handleRegister, handleLogin, handleRefresh, handleLogout } from '../handlers/authHandler'
import { handleForgotPassword, handleVerifyResetToken, handleResetPassword } from '../handlers/resetPasswordHandler'
import { authMiddleware } from '../middleware/auth'
import { jsonResponse, notFound } from '../utils/response'

type Env = {
  DB: D1Database
  JWT_SECRET: string
  CACHE: KVNamespace
}

// 认证中间件写入的上下文变量
type Variables = {
  userId: string
  userEmail?: string
}

const authRoutes = new Hono<{ Bindings: Env; Variables: Variables }>()

// 开放接口（无需认证）
authRoutes.post('/register', async (c) => handleRegister(c.req.raw, c.env as Env))
authRoutes.post('/login', async (c) => handleLogin(c.req.raw, c.env as Env))
authRoutes.post('/refresh', async (c) => handleRefresh(c.req.raw, c.env as Env))
authRoutes.post('/logout', async (c) => handleLogout(c.req.raw, c.env as Env))
authRoutes.post('/forgot-password', async (c) => handleForgotPassword(c.req.raw, c.env as Env))
authRoutes.get('/verify-reset-token', async (c) => handleVerifyResetToken(c.req.raw, c.env as Env))
authRoutes.post('/reset-password', async (c) => handleResetPassword(c.req.raw, c.env as Env))

// 当前用户信息（仅此接口需要认证）
authRoutes.get('/me', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId')

    const user = await c.env.DB
      .prepare('SELECT id, email, name, avatar, created_at FROM users WHERE id = ?')
      .bind(userId)
      .first()

    if (!user) {
      return notFound('User not found')
    }

    return jsonResponse({
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      created_at: user.created_at
    })
  } catch (err) {
    console.error('Get current user error:', err)
    return jsonResponse({ error: 'Failed to get current user' }, 500)
  }
})

export { authRoutes }
