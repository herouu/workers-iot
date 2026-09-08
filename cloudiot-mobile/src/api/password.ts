import { request } from './request'

export interface ForgotPasswordRequest {
  email: string
}

export interface ResetPasswordRequest {
  token: string
  email: string
  newPassword: string
}

export function forgotPassword(data: ForgotPasswordRequest) {
  return request('/api/v1/auth/forgot-password', {
    method: 'POST',
    body: data
  })
}

export function verifyResetToken(token: string, email: string) {
  return request('/api/v1/auth/verify-reset-token', {
    method: 'GET',
    params: { token, email }
  })
}

export function resetPassword(data: ResetPasswordRequest) {
  return request('/api/v1/auth/reset-password', {
    method: 'POST',
    body: data
  })
}
