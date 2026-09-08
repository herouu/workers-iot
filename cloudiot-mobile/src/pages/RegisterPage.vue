<template>
  <div class="min-h-screen bg-surface">
    <!-- 顶部导航 -->
    <header class="flex items-center justify-between px-5 py-4 border-b border-surface-elevated/50">
      <button @click="router.back()" class="text-text-primary text-2xl">‹</button>
      <span class="text-text-primary font-semibold">注册</span>
      <span class="w-6"></span>
    </header>

    <form @submit.prevent="onSubmit" class="p-5 space-y-4">
      <div class="bg-surface-card rounded-2xl p-4 space-y-3">
        <div>
          <label class="block text-text-secondary text-sm mb-1">用户名</label>
          <input
            v-model="form.username"
            type="text"
            required
            placeholder="请输入用户名"
            class="w-full bg-surface-elevated border border-surface-elevated rounded-xl px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:border-brand transition-colors"
          />
        </div>
        <div class="border-t border-surface-elevated/50"></div>
        <div>
          <label class="block text-text-secondary text-sm mb-1">邮箱</label>
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
        <div class="border-t border-surface-elevated/50"></div>
        <div>
          <label class="block text-text-secondary text-sm mb-1">确认密码</label>
          <input
            v-model="form.confirmPassword"
            type="password"
            required
            placeholder="请再次输入密码"
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
        注册
      </button>
    </form>

    <div class="text-center mt-4">
      <span class="text-text-secondary text-sm">已有账号？</span>
      <router-link to="/login" class="text-brand text-sm ml-1 hover:underline">立即登录</router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { register } from '@/api/auth'

const router = useRouter()
const loading = ref(false)

const form = ref({
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
})

const onSubmit = async () => {
  if (form.value.password !== form.value.confirmPassword) {
    showToast('两次密码输入不一致')
    return
  }

  loading.value = true
  try {
    await register({
      username: form.value.username,
      email: form.value.email,
      password: form.value.password
    })
    showToast('注册成功')
    router.push('/login')
  } catch (error: any) {
    showToast(error.message || '注册失败')
  } finally {
    loading.value = false
  }
}

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
