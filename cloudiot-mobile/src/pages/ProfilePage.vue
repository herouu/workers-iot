<template>
  <div class="min-h-screen bg-surface">
    <!-- 顶部导航 -->
    <header class="sticky top-0 bg-surface/95 backdrop-blur border-b border-surface-elevated/50 px-5 py-4 flex items-center justify-between">
      <button @click="$router.back()" class="text-text-primary text-2xl">‹</button>
      <span class="text-text-primary font-semibold">账号信息</span>
      <button @click="handleSave" class="text-brand font-medium">保存</button>
    </header>

    <!-- 头像区域 -->
    <div class="bg-gradient-to-br from-surface-card to-surface-elevated px-5 pt-8 pb-6 flex flex-col items-center gap-3">
      <div class="w-20 h-20 rounded-full bg-surface-elevated border-2 border-brand flex items-center justify-center">
        <span class="text-4xl">👤</span>
      </div>
      <span class="text-text-secondary text-sm">修改头像</span>
    </div>

    <!-- 信息表单 -->
    <div class="px-5 py-4 space-y-4">
      <div class="bg-surface-card rounded-2xl overflow-hidden">
        <div class="flex items-center justify-between px-4 py-4">
          <span class="text-text-secondary">用户名</span>
          <input 
            class="bg-transparent text-text-primary text-right outline-none" 
            v-model="formData.username" 
            placeholder="请输入用户名"
          />
        </div>
        <div class="h-px bg-surface-elevated/50 mx-4"></div>
        <div class="flex items-center justify-between px-4 py-4">
          <span class="text-text-secondary">手机号</span>
          <input 
            class="bg-transparent text-text-primary text-right outline-none" 
            v-model="formData.phone" 
            placeholder="请输入手机号"
            type="tel"
          />
        </div>
        <div class="h-px bg-surface-elevated/50 mx-4"></div>
        <div class="flex items-center justify-between px-4 py-4">
          <span class="text-text-secondary">邮箱</span>
          <input 
            class="bg-transparent text-text-primary text-right outline-none" 
            v-model="formData.email" 
            placeholder="请输入邮箱"
            type="email"
          />
        </div>
      </div>

      <div class="bg-surface-card rounded-2xl overflow-hidden">
        <div class="flex items-center justify-between px-4 py-4">
          <span class="text-text-secondary">设备数</span>
          <span class="text-text-muted">{{ stats.deviceCount }} 个</span>
        </div>
        <div class="h-px bg-surface-elevated/50 mx-4"></div>
        <div class="flex items-center justify-between px-4 py-4">
          <span class="text-text-secondary">场景数</span>
          <span class="text-text-muted">{{ stats.sceneCount }} 个</span>
        </div>
        <div class="h-px bg-surface-elevated/50 mx-4"></div>
        <div class="flex items-center justify-between px-4 py-4">
          <span class="text-text-secondary">注册时间</span>
          <span class="text-text-muted">{{ stats.regTime }}</span>
        </div>
      </div>

      <div class="bg-surface-card rounded-2xl overflow-hidden">
        <div 
          class="flex items-center justify-between px-4 py-4 cursor-pointer hover:bg-surface-elevated/50 transition-colors"
          @click="showPasswordDialog = true"
        >
          <span class="text-text-primary">修改密码</span>
          <span class="text-text-muted">›</span>
        </div>
      </div>
    </div>

    <!-- 密码修改弹窗 -->
    <div v-if="showPasswordDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-5">
      <div class="bg-surface-card rounded-2xl w-full max-w-sm p-6 space-y-4">
        <h3 class="text-text-primary text-lg font-semibold">修改密码</h3>
        <div class="space-y-3">
          <input
            v-model="passwordForm.oldPassword"
            type="password"
            placeholder="请输入原密码"
            class="w-full bg-surface-elevated border border-surface-elevated rounded-xl px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:border-brand transition-colors"
          />
          <input
            v-model="passwordForm.newPassword"
            type="password"
            placeholder="请输入新密码"
            class="w-full bg-surface-elevated border border-surface-elevated rounded-xl px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:border-brand transition-colors"
          />
          <input
            v-model="passwordForm.confirmPassword"
            type="password"
            placeholder="请再次输入新密码"
            class="w-full bg-surface-elevated border border-surface-elevated rounded-xl px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:border-brand transition-colors"
          />
        </div>
        <div class="flex gap-3">
          <button
            @click="showPasswordDialog = false"
            class="flex-1 h-11 bg-surface-elevated text-text-primary rounded-xl font-medium"
          >
            取消
          </button>
          <button
            @click="handlePasswordChange"
            class="flex-1 h-11 bg-brand text-surface rounded-xl font-medium"
          >
            确认
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const formData = ref({
  username: '智能用户',
  phone: '138****8888',
  email: 'user@example.com'
})

const stats = ref({
  deviceCount: 8,
  sceneCount: 3,
  regTime: '2024-01-15'
})

const showPasswordDialog = ref(false)

const passwordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

function handleSave() {
  showToast('保存成功')
}

function handlePasswordChange() {
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    showToast('两次密码输入不一致')
    return
  }
  if (passwordForm.value.newPassword.length < 6) {
    showToast('密码长度不能少于6位')
    return
  }
  showToast('密码修改成功')
  passwordForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
  showPasswordDialog.value = false
}

function showToast(message: string) {
  const toast = document.createElement('div')
  toast.className = 'fixed top-20 left-1/2 -translate-x-1/2 bg-surface-elevated text-text-primary px-6 py-3 rounded-xl shadow-lg z-[60] text-sm font-medium'
  toast.textContent = message
  document.body.appendChild(toast)
  setTimeout(() => {
    toast.style.opacity = '0'
    toast.style.transition = 'opacity 0.3s'
    setTimeout(() => toast.remove(), 300)
  }, 2000)
}
</script>
