/**
 * 认证路由
 */
import { Hono } from 'hono'
import { handleRegister, handleLogin, handleRefresh, handleLogout } from '../handlers/authHandler'
import { handleForgotPassword, handleVerifyResetToken, handleResetPassword } from '../handlers/resetPasswordHandler'

type Env = {
  DB: D1Database
  JWT_SECRET: string
  CACHE: KVNamespace
}

const authRoutes = new Hono<{ Bindings: Env }>()

authRoutes.post('/register', async (c) => handleRegister(c.req.raw, c.env as Env))
authRoutes.post('/login', async (c) => handleLogin(c.req.raw, c.env as Env))
authRoutes.post('/refresh', async (c) => handleRefresh(c.req.raw, c.env as Env))
authRoutes.post('/logout', async (c) => handleLogout(c.req.raw, c.env as Env))
authRoutes.post('/forgot-password', async (c) => handleForgotPassword(c.req.raw, c.env as Env))
authRoutes.get('/verify-reset-token', async (c) => handleVerifyResetToken(c.req.raw, c.env as Env))
authRoutes.post('/reset-password', async (c) => handleResetPassword(c.req.raw, c.env as Env))

export { authRoutes }
