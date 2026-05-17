/**
 * 认证路由
 */
import { Hono } from 'hono'
import { handleRegister, handleLogin, handleRefresh, handleLogout } from '../handlers/authHandler'

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

export { authRoutes }
