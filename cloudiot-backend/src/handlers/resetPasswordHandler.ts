/**
 * 密码重置处理器
 */
import { jsonError, success, badRequest } from '../utils/response'
import { hashPassword } from '../utils/password'
import { generateResetToken, hashToken } from '../utils/resetToken'

type Env = {
  DB: D1Database
  JWT_SECRET: string
  CACHE: KVNamespace
}

/**
 * 请求密码重置 - 生成重置令牌并存储
 * POST /api/auth/forgot-password
 */
export async function handleForgotPassword(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return badRequest('Email is required')
    }

    // 查找用户（不暴露是否存在）
    const user = await env.DB
      .prepare('SELECT id, email FROM users WHERE email = ?')
      .bind(email)
      .first()

    // 无论用户是否存在，都返回成功（安全考虑）
    if (!user) {
      return success({ message: 'If the email exists, a reset link has been sent' })
    }

    // 生成重置令牌
    const token = generateResetToken()
    const tokenHash = await hashToken(token)
    const expiresAt = Math.floor(Date.now() / 1000) + 3600 // 1小时有效期

    // 存储令牌
    await env.DB
      .prepare(`
        INSERT INTO password_resets (id, user_id, token_hash, expires_at)
        VALUES (?, ?, ?, ?)
      `)
      .bind(crypto.randomUUID(), user.id, tokenHash, expiresAt)
      .run()

    // 在实际生产环境中，这里应该发送邮件
    // 在开发环境中，直接返回令牌（方便测试）
    const resetUrl = `http://localhost:5173/reset-password?token=${token}&email=${encodeURIComponent(email)}`

    return success({
      message: 'If the email exists, a reset link has been sent',
      // 开发环境返回以下信息，生产环境应移除
      debug: {
        token,
        resetUrl,
        email: user.email
      }
    })

  } catch (err) {
    console.error('Forgot password error:', err)
    return jsonError('Failed to process request', 500)
  }
}

/**
 * 验证重置令牌
 * GET /api/auth/verify-reset-token?token=xxx&email=xxx
 */
export async function handleVerifyResetToken(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url)
    const token = url.searchParams.get('token')
    const email = url.searchParams.get('email')

    if (!token || !email) {
      return badRequest('Token and email are required')
    }

    const tokenHash = await hashToken(token)

    // 查找有效的重置令牌
    const resetRecord = await env.DB
      .prepare(`
        SELECT pr.*, u.email
        FROM password_resets pr
        JOIN users u ON pr.user_id = u.id
        WHERE pr.token_hash = ? AND u.email = ? AND pr.expires_at > ? AND pr.used = 0
      `)
      .bind(tokenHash, email, Math.floor(Date.now() / 1000))
      .first()

    if (!resetRecord) {
      return jsonError('Invalid or expired token', 400)
    }

    return success({ valid: true, email })

  } catch (err) {
    console.error('Verify token error:', err)
    return jsonError('Failed to verify token', 500)
  }
}

/**
 * 重置密码
 * POST /api/auth/reset-password
 */
export async function handleResetPassword(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json()
    const { token, email, newPassword } = body

    if (!token || !email || !newPassword) {
      return badRequest('Token, email, and new password are required')
    }

    if (newPassword.length < 6) {
      return badRequest('Password must be at least 6 characters')
    }

    const tokenHash = await hashToken(token)

    // 查找有效的重置令牌
    const resetRecord = await env.DB
      .prepare(`
        SELECT pr.*, u.email
        FROM password_resets pr
        JOIN users u ON pr.user_id = u.id
        WHERE pr.token_hash = ? AND u.email = ? AND pr.expires_at > ? AND pr.used = 0
      `)
      .bind(tokenHash, email, Math.floor(Date.now() / 1000))
      .first()

    if (!resetRecord) {
      return jsonError('Invalid or expired token', 400)
    }

    // 更新密码
    const passwordHash = await hashPassword(newPassword)
    await env.DB
      .prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
      .bind(passwordHash, Math.floor(Date.now() / 1000), resetRecord.user_id)
      .run()

    // 标记令牌已使用
    await env.DB
      .prepare('UPDATE password_resets SET used = 1 WHERE id = ?')
      .bind(resetRecord.id)
      .run()

    return success({ message: 'Password has been reset successfully' })

  } catch (err) {
    console.error('Reset password error:', err)
    return jsonError('Failed to reset password', 500)
  }
}
