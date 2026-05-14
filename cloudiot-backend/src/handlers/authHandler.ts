/**
 * 认证处理器
 */
import { jsonResponse, jsonError, success, unauthorized } from '../utils/response'
import { hashPassword, verifyPassword, generateUserId } from '../utils/password'
import { generateTokenPair, verifyToken } from '../utils/jwt'

export async function handleRegister(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json()
    const { email, password, name } = body
    
    // 验证必填字段
    if (!email || !password) {
      return jsonError('Email and password are required', 400)
    }
    
    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return jsonError('Invalid email format', 400)
    }
    
    // 验证密码长度
    if (password.length < 6) {
      return jsonError('Password must be at least 6 characters', 400)
    }
    
    // 检查用户是否已存在
    const existingUser = await env.DB
      .prepare('SELECT id FROM users WHERE email = ?')
      .bind(email)
      .first()
    
    if (existingUser) {
      return jsonError('User already exists', 409)
    }
    
    // 创建用户
    const userId = generateUserId()
    const passwordHash = await hashPassword(password)
    
    await env.DB
      .prepare(`
        INSERT INTO users (id, email, password_hash, name)
        VALUES (?, ?, ?, ?)
      `)
      .bind(userId, email, passwordHash, name || null)
      .run()
    
    // 生成令牌
    const tokens = await generateTokenPair({ id: userId, email, name }, env.JWT_SECRET)
    
    return jsonResponse({
      user: {
        id: userId,
        email,
        name
      },
      ...tokens
    }, 201)
    
  } catch (err) {
    console.error('Register error:', err)
    return jsonError('Registration failed', 500)
  }
}

export async function handleLogin(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json()
    const { email, password } = body
    
    if (!email || !password) {
      return jsonError('Email and password are required', 400)
    }
    
    // 查找用户
    const user = await env.DB
      .prepare('SELECT * FROM users WHERE email = ?')
      .bind(email)
      .first()
    
    if (!user) {
      return unauthorized('Invalid email or password')
    }
    
    // 验证密码
    const passwordValid = await verifyPassword(password, user.password_hash)
    if (!passwordValid) {
      return unauthorized('Invalid email or password')
    }
    
    // 生成令牌
    const tokens = await generateTokenPair(
      { id: user.id, email: user.email, name: user.name },
      env.JWT_SECRET
    )
    
    return jsonResponse({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar
      },
      ...tokens
    })
    
  } catch (err) {
    console.error('Login error:', err)
    return jsonError('Login failed', 500)
  }
}

export async function handleRefresh(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json()
    const { refreshToken } = body
    
    if (!refreshToken) {
      return jsonError('Refresh token is required', 400)
    }
    
    // 验证 refresh token
    const payload = await verifyToken(refreshToken, env.JWT_SECRET)
    if (!payload || payload.type !== 'refresh') {
      return unauthorized('Invalid refresh token')
    }
    
    // 检查 token 是否在黑名单中
    const blacklisted = await env.CACHE.get(`blacklist:${refreshToken}`)
    if (blacklisted) {
      return unauthorized('Token has been revoked')
    }
    
    // 获取用户信息
    const user = await env.DB
      .prepare('SELECT * FROM users WHERE id = ?')
      .bind(payload.sub)
      .first()
    
    if (!user) {
      return unauthorized('User not found')
    }
    
    // 将旧 token 加入黑名单
    await env.CACHE.put(`blacklist:${refreshToken}`, '1', { expirationTtl: 604800 })
    
    // 生成新令牌
    const tokens = await generateTokenPair(
      { id: user.id, email: user.email, name: user.name },
      env.JWT_SECRET
    )
    
    return jsonResponse(tokens)
    
  } catch (err) {
    console.error('Refresh error:', err)
    return jsonError('Token refresh failed', 500)
  }
}

export async function handleLogout(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json()
    const { refreshToken } = body
    
    if (refreshToken) {
      // 将 token 加入黑名单
      await env.CACHE.put(`blacklist:${refreshToken}`, '1', { expirationTtl: 604800 })
    }
    
    return success({ message: 'Logged out successfully' })
    
  } catch (err) {
    console.error('Logout error:', err)
    return jsonError('Logout failed', 500)
  }
}
