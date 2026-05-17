<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center px-4">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-blue-500">CloudIoT</h1>
        <p class="text-gray-500 mt-2">登录您的账户</p>
      </div>

      <van-form @submit="handleLogin">
        <van-cell-group inset>
          <van-field
            v-model="form.email"
            name="email"
            label="📧"
            placeholder="邮箱地址"
            :rules="[{ required: true, message: '请输入邮箱' }]"
          />
          <van-field
            v-model="form.password"
            type="password"
            name="password"
            label="🔒"
            placeholder="密码"
            :rules="[{ required: true, message: '请输入密码' }]"
          />
        </van-cell-group>

        <div class="px-4 mt-4">
          <van-button
            round
            block
            type="primary"
            native-type="submit"
            :loading="loading"
          >
            登录
          </van-button>
        </div>
      </van-form>

      <div class="text-center mt-4">
        <span class="text-gray-500 text-sm">还没有账户?</span>
        <router-link to="/register" class="text-blue-500 text-sm ml-1">
          立即注册
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
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
    // 调用真实登录 API
    const response = await login({
      email: form.email,
      password: form.password
    })
    
    // 保存 token
    localStorage.setItem('accessToken', response.accessToken)
    if (response.refreshToken) {
      localStorage.setItem('refreshToken', response.refreshToken)
    }
    
    // 更新 store
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
</script>
