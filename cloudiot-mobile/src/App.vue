<template>
  <div class="min-h-screen bg-gray-50">
    <router-view />
    
    <!-- 底部标签栏 -->
    <van-tabbar 
      v-if="showTabbar" 
      v-model="active" 
      @change="handleTabChange"
      route
      safe-area-inset-bottom
    >
      <van-tabbar-item to="/" icon="home-o">首页</van-tabbar-item>
      <van-tabbar-item to="/devices" icon="apps-o">设备</van-tabbar-item>
      <van-tabbar-item to="/scenes" icon="play-circle-o">场景</van-tabbar-item>
      <van-tabbar-item to="/settings" icon="setting-o">设置</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const authStore = useAuthStore()

const active = ref(0)

const showTabbar = computed(() => {
  return authStore.isAuthenticated && !route.meta.hideTabbar
})

watch(() => route.path, (path) => {
  if (path === '/') active.value = 0
  else if (path.startsWith('/devices')) active.value = 1
  else if (path.startsWith('/scenes')) active.value = 2
  else if (path.startsWith('/settings')) active.value = 3
})

function handleTabChange(index: number) {
  active.value = index
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
}

#app {
  min-height: 100vh;
}
</style>
