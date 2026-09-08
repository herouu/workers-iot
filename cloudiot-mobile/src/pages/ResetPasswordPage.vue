<template>
  <div class="min-h-screen bg-surface flex items-center justify-center px-5">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface-card flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
        </div>
        <h1 class="text-2xl font-bold text-text-primary">重置密码</h1>
        <p class="text-text-secondary mt-2 text-sm">请设置新密码</p>
      </div>

      <!-- 验证中 -->
      <div v-if="verifying" class="text-center py-12">
        <div class="animate-spin w-8 h-8 border-3 border-brand border-t-transparent rounded-full mx-auto"></div>
        <div class="text-text-secondary mt-4">验证中...</div>
      </div>

      <!-- 令牌无效 -->
      <div v-else-if="!tokenValid && !verifying" class="text-center space-y-4">
        <div class="bg-surface-card rounded-2xl p-6">
          <div class="text-4xl mb-3">⚠️</div>
          <div class="text-text-primary font-medium">链接已失效</div>
          <div class="text-text-secondary text-sm mt-1">重置链接已过期或已被使用</div>
        </div>
        <router-link to="/forgot-password" class="inline-block px-6 py-3 bg-brand text-surface rounded-xl font-medium">
          重新申请
        </router-link>
      </div>

      <!-- 重置表单 -->
      <div v-else class="space-y-4">
        <div class="bg-surface-card rounded-2xl p-4 space-y-3">
          <div>
            <label class="block text-text-secondary text-sm mb-1">新密码</label>
            <input
              v-model="newPassword"
              type="password"
              placeholder="至少6位字符"
              class="w-full bg-surface-elevated border border-surface-elevated rounded-xl px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:border-brand transition-colors"
            />
          </div>
          <div class="border-t border-surface-elevated/50"></div>
          <div>
            <label class="block text-text-secondary text-sm mb-1">确认新密码</label>
            <input
              v-model="confirmPassword"
              type="password"
              placeholder="再次输入新密码"
              class="w-full bg-surface-elevated border border-surface-elevated rounded-xl px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:border-brand transition-colors"
            />
          </div>
        </div>

        <button
          @click="handleResetPassword"
          :disabled="loading || !newPassword || !confirmPassword"
          class="w-full h-12 bg-brand hover:bg-brand-dark text-surface font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          <span v-if="loading" class="animate-spin w-5 h-5 border-2 border-surface border-t-transparent rounded-full mr-2"></span>
          {{ loading ? '重置中...' : '确认重置' }}
        </button>

        <div v-if="error" class="text-red-400 text-sm text-center">{{ error }}</div>
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
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { verifyResetToken, resetPassword } from '@/api/password'

const route = useRoute()
const router = useRouter()

const verifying = ref(true)
const tokenValid = ref(false)
const token = ref('')
const email = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')

onMounted(async () => {
  token.value = route.query.token as string
  email.value = route.query.email as string

  if (!token.value || !email.value) {
    verifying.value = false
    tokenValid.value = false
    return
  }

  try {
    await verifyResetToken(token.value, email.value)
    tokenValid.value = true
  } catch {
    tokenValid.value = false
  } finally {
    verifying.value = false
  }
})

async function handleResetPassword() {
  error.value = ''

  if (newPassword.value !== confirmPassword.value) {
    error.value = '两次密码输入不一致'
    return
  }

  if (newPassword.value.length < 6) {
    error.value = '密码长度不能少于6位'
    return
  }

  loading.value = true
  try {
    await resetPassword({
      token: token.value,
      email: email.value,
      newPassword: newPassword.value
    })
    showToast('密码重置成功，请使用新密码登录')
    setTimeout(() => router.replace('/login'), 1500)
  } catch (err: any) {
    error.value = err.message || '重置失败'
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
