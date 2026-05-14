/**
 * JWT 工具函数
 */
import * as jose from 'jose'

const ALGORITHM = 'HS256'
const ACCESS_TOKEN_EXPIRY = '15m'
const REFRESH_TOKEN_EXPIRY = '7d'

export interface TokenPayload {
  sub: string      // 用户 ID
  email: string
  name?: string
  type: 'access' | 'refresh'
}

export async function generateAccessToken(payload: TokenPayload, secret: string): Promise<string> {
  const key = new TextEncoder().encode(secret)
  const token = await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(key)
  return token
}

export async function generateRefreshToken(payload: TokenPayload, secret: string): Promise<string> {
  const key = new TextEncoder().encode(secret)
  const token = await new jose.SignJWT({ ...payload, type: 'refresh' })
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(key)
  return token
}

export async function verifyToken(token: string, secret: string): Promise<TokenPayload | null> {
  try {
    const key = new TextEncoder().encode(secret)
    const { payload } = await jose.jwtVerify(token, key)
    return payload as unknown as TokenPayload
  } catch (err) {
    console.error('Token verification failed:', err)
    return null
  }
}

export async function generateTokenPair(user: { id: string; email: string; name?: string }, secret: string) {
  const payload = {
    sub: user.id,
    email: user.email,
    name: user.name
  }
  
  const accessToken = await generateAccessToken({ ...payload, type: 'access' }, secret)
  const refreshToken = await generateRefreshToken(payload, secret)
  
  return { accessToken, refreshToken }
}
