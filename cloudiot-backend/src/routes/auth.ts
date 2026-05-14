/**
 * 认证路由
 */
import { Router } from 'itty-router'
import { handleRegister, handleLogin, handleRefresh, handleLogout } from '../handlers/authHandler'

const router = Router()

// POST /api/v1/auth/register - 用户注册
router.post('/register', handleRegister)

// POST /api/v1/auth/login - 用户登录
router.post('/login', handleLogin)

// POST /api/v1/auth/refresh - 刷新令牌
router.post('/refresh', handleRefresh)

// POST /api/v1/auth/logout - 用户登出
router.post('/logout', handleLogout)

export { router as authRouter }
