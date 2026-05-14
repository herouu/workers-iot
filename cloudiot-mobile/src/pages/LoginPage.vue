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

const router = useRouter()
const loading = ref(false)

const form = reactive({
  email: '',
  password: ''
})

async function handleLogin() {
  loading.value = true
  try {
    // 模拟登录
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    localStorage.setItem('accessToken', 'mock-token')
    localStorage.setItem('refreshToken', 'mock-refresh-token')
    
    router.replace('/home')
  } catch (error) {
    showToast('登录失败')
  } finally {
    loading.value = false
  }
}
</script>
