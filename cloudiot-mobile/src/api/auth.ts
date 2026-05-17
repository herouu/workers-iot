import { request } from './request'

export interface RegisterData {
  username: string
  email: string
  password: string
}

export interface LoginData {
  email: string
  password: string
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: {
    id: string
    name: string | null
    email: string
    avatar?: string | null
  }
}

export const register = (data: RegisterData) => {
  return request<AuthResponse>('/api/v1/auth/register', {
    method: 'POST',
    body: data
  })
}

export const login = (data: LoginData) => {
  return request<AuthResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: data
  })
}

export const logout = () => {
  return request('/api/v1/auth/logout', {
    method: 'POST'
  })
}

export const refreshToken = (refreshToken: string) => {
  return request<AuthResponse>('/api/v1/auth/refresh', {
    method: 'POST',
    body: { refreshToken }
  })
}

export const getCurrentUser = () => {
  return request<AuthResponse['user']>('/api/v1/auth/me')
}
