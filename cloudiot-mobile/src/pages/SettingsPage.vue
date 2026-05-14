<template>
  <div class="min-h-screen bg-gray-50 pb-20">
    <!-- 顶部导航 -->
    <div class="bg-white px-4 pt-12 pb-4">
      <h1 class="text-xl font-bold">设置</h1>
    </div>

    <!-- 设置列表 -->
    <van-cell-group inset class="mt-4">
      <van-cell title="账号信息" is-link to="/settings/profile" />
      <van-cell title="通知设置" is-link to="/settings/notifications" />
      <van-cell title="设备管理" is-link to="/settings/devices" />
    </van-cell-group>

    <van-cell-group inset class="mt-4">
      <van-cell title="关于我们" is-link />
      <van-cell title="帮助与反馈" is-link />
      <van-cell title="检查更新" is-link value="v1.0.0" />
    </van-cell-group>

    <div class="px-4 mt-8">
      <van-button block type="danger" @click="handleLogout">
        退出登录
      </van-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { showConfirmDialog } from 'vant'

const router = useRouter()

async function handleLogout() {
  try {
    await showConfirmDialog({
      title: '提示',
      message: '确定要退出登录吗?'
    })
    
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    router.replace('/login')
  } catch {
    // 取消操作
  }
}
</script>
