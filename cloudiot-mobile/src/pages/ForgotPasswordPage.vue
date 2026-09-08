<template>
  <div class="min-h-screen bg-surface flex items-center justify-center px-5">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface-card flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        <h1 class="text-2xl font-bold text-text-primary">找回密码</h1>
        <p class="text-text-secondary mt-2 text-sm">输入注册邮箱，我们将发送重置链接</p>
      </div>

      <!-- 步骤1: 输入邮箱 -->
      <div v-if="step === 1" class="space-y-4">
        <div class="bg-surface-card rounded-2xl p-4">
          <label class="block text-text-secondary text-sm mb-1">邮箱地址</label>
          <input
            v-model="email"
            type="email"
            required
            placeholder="请输入注册邮箱"
            class="w-full bg-surface-elevated border border-surface-elevated rounded-xl px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:border-brand transition-colors"
          />
        </div>

        <button
          @click="handleForgotPassword"
          :disabled="loading || !email"
          class="w-full h-12 bg-brand hover:bg-brand-dark text-surface font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          <span v-if="loading" class="animate-spin w-5 h-5 border-2 border-surface border-t-transparent rounded-full mr-2"></span>
          {{ loading ? '发送中...' : '发送重置链接' }}
        </button>
      </div>

      <!-- 步骤2: 提示已发送 -->
      <div v-if="step === 2" class="text-center space-y-4">
        <!-- 开发环境：重置链接直接显示为主按钮 -->
        <div v-if="debugInfo" class="space-y-4">
          <div class="bg-surface-card rounded-2xl p-4 space-y-3">
            <div class="w-12 h-12 mx-auto rounded-full bg-brand/10 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <div class="text-text-primary font-medium">重置链接已生成</div>
            <div class="text-text-secondary text-sm">点击下方按钮重置密码</div>
          </div>

          <a
            :href="debugInfo.resetUrl"
            class="block w-full h-12 bg-brand hover:bg-brand-dark text-surface font-semibold rounded-xl transition-colors items-center justify-center"
            style="display: flex;"
          >
            前往重置密码 →
          </a>

          <div class="bg-surface-card rounded-2xl p-3 text-left space-y-1">
            <div class="text-text-muted text-xs">开发调试 - 重置链接:</div>
            <div class="text-text-muted text-xs break-all select-all">{{ debugInfo.resetUrl }}</div>
          </div>
        </div>

        <!-- 生产环境：仅显示提示 -->
        <div v-else class="bg-surface-card rounded-2xl p-6 space-y-3">
          <div class="w-12 h-12 mx-auto rounded-full bg-brand/10 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div class="text-text-primary font-medium">重置链接已发送</div>
          <div class="text-text-secondary text-sm">请检查邮箱 <span class="text-brand">{{ email }}</span></div>
          <div class="text-text-muted text-xs">链接有效期1小时</div>
        </div>

        <button
          @click="step = 1"
          class="text-text-secondary text-sm hover:text-text-primary"
        >
          重新发送
        </button>
      </div>

      <div class="text-center mt-6">
        <router-link to="/login" class="text-text-secondary text-sm hover:text-text-primary flex items-center justify-center gap-1">
          <span>←</span> 返回登录
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { forgotPassword } from '@/api/password'

const step = ref(1)
const email = ref('')
const loading = ref(false)
const debugInfo = ref<any>(null)

async function handleForgotPassword() {
  if (!email.value) return

  loading.value = true
  try {
    const res: any = await forgotPassword({ email: email.value })
    if (res.debug) {
      debugInfo.value = res.debug
    }
    step.value = 2
  } catch (error: any) {
    showToast(error.message || '发送失败')
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
