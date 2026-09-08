<template>
  <div class="min-h-screen bg-surface flex items-center justify-center px-5">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-brand">CloudIoT</h1>
        <p class="text-text-secondary mt-2">登录您的账户</p>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <div class="bg-surface-card rounded-2xl p-4 space-y-3">
          <div>
            <label class="block text-text-secondary text-sm mb-1">邮箱地址</label>
            <input
              v-model="form.email"
              type="email"
              required
              placeholder="请输入邮箱"
              class="w-full bg-surface-elevated border border-surface-elevated rounded-xl px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:border-brand transition-colors"
            />
          </div>
          <div class="border-t border-surface-elevated/50"></div>
          <div>
            <label class="block text-text-secondary text-sm mb-1">密码</label>
            <input
              v-model="form.password"
              type="password"
              required
              placeholder="请输入密码"
              class="w-full bg-surface-elevated border border-surface-elevated rounded-xl px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:border-brand transition-colors"
            />
          </div>
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full h-12 bg-brand hover:bg-brand-dark text-surface font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          <span v-if="loading" class="animate-spin w-5 h-5 border-2 border-surface border-t-transparent rounded-full mr-2"></span>
          登录
        </button>
      </form>

      <div class="text-center mt-4">
        <router-link to="/forgot-password" class="text-text-muted text-sm hover:text-brand transition-colors">
          忘记密码？
        </router-link>
      </div>

      <div class="text-center mt-6">
        <span class="text-text-secondary text-sm">还没有账户?</span>
        <router-link to="/register" class="text-brand text-sm ml-1 hover:underline">
          立即注册
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { login } from '@/api/auth'

const router = useRouter()
const authStore = useAuthStore()
const loading = ref(false)

const form = reactive({
  email: '',
  password: ''
})

async function handleLogin() {
  loading.value = true
  try {
    const response = await login({
      email: form.email,
      password: form.password
    })
    
    localStorage.setItem('accessToken', response.accessToken)
    if (response.refreshToken) {
      localStorage.setItem('refreshToken', response.refreshToken)
    }
    
    authStore.user = {
      id: response.user.id,
      name: response.user.name || response.user.email,
      email: response.user.email,
      avatar: response.user.avatar
    }
    authStore.accessToken = response.accessToken
    
    showToast('登录成功')
    router.replace('/home')
  } catch (error: any) {
    showToast(error.message || '登录失败，请检查邮箱和密码')
  } finally {
    loading.value = false
  }
}

// 简易toast实现
function showToast(message: string) {
  const toast = document.createElement('div')
  toast.className = 'fixed top-20 left-1/2 -translate-x-1/2 bg-surface-elevated text-text-primary px-6 py-3 rounded-xl shadow-lg z-50 text-sm font-medium'
  toast.textContent = message
  document.body.appendChild(toast)
  setTimeout(() => {
    toast.style.opacity = '0'
    toast.style.transition = 'opacity 0.3s'
    setTimeout(() => toast.remove(), 300)
  }, 2000)
}
</script>
