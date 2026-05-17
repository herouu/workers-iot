import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as apiLogin, logout as apiLogout, refreshToken, getCurrentUser } from '@/api/auth'

interface User {
  id: string
  name?: string | null
  email: string
  avatar?: string | null
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const accessToken = ref<string | null>(localStorage.getItem('accessToken'))
  const refreshTokenValue = ref<string | null>(localStorage.getItem('refreshToken'))
  const loading = ref(false)

  const isAuthenticated = computed(() => !!accessToken.value)

  const setTokens = (access: string, refresh?: string) => {
    accessToken.value = access
    localStorage.setItem('accessToken', access)
    if (refresh) {
      refreshTokenValue.value = refresh
      localStorage.setItem('refreshToken', refresh)
    }
  }

  const clearTokens = () => {
    accessToken.value = null
    refreshTokenValue.value = null
    user.value = null
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
  }

  const login = async (email: string, password: string) => {
    loading.value = true
    try {
      const response = await apiLogin({ email, password })
      setTokens(response.accessToken, response.refreshToken)
      user.value = response.user
      return response
    } finally {
      loading.value = false
    }
  }

  const logout = async () => {
    loading.value = true
    try {
      await apiLogout()
    } catch (error) {
      console.error('Logout API failed:', error)
    } finally {
      clearTokens()
      loading.value = false
    }
  }

  const fetchCurrentUser = async () => {
    if (!accessToken.value) return null
    try {
      const userData = await getCurrentUser()
      user.value = userData
      return userData
    } catch (error) {
      clearTokens()
      return null
    }
  }

  const updateTokens = async () => {
    if (!refreshTokenValue.value) return false
    try {
      const response = await refreshToken(refreshTokenValue.value)
      setTokens(response.accessToken, response.refreshToken)
      return true
    } catch {
      clearTokens()
      return false
    }
  }

  return {
    user,
    accessToken,
    loading,
    isAuthenticated,
    login,
    logout,
    fetchCurrentUser,
    updateTokens,
    clearTokens
  }
})
