<template>
  <div class="home-page">
    <!-- 顶部渐变背景 -->
    <div class="header-gradient">
      <div class="header-content">
        <div class="header-top">
          <div class="greeting">
            <h1 class="app-title">CloudIoT</h1>
            <p class="greeting-text">{{ greeting }}</p>
          </div>
          <div class="user-avatar" @click="goToSettings">
            <span class="avatar-text">{{ userInitials }}</span>
          </div>
        </div>
        
        <!-- 时间天气卡片 -->
        <div class="time-card">
          <div class="time-info">
            <span class="current-time">{{ currentTime }}</span>
            <span class="current-date">{{ currentDate }}</span>
          </div>
          <div class="weather-info">
            <span class="weather-icon">🌤️</span>
            <span class="weather-text">{{ weather }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="content-area">
      <!-- 设备状态总览 -->
      <div class="status-section">
        <div class="section-title">
          <span>设备状态</span>
          <van-tag type="success" size="medium">{{ onlineCount }} 在线</van-tag>
        </div>
        <div class="status-cards">
          <div class="status-card online">
            <div class="status-icon">✓</div>
            <div class="status-num">{{ onlineCount }}</div>
            <div class="status-label">在线</div>
          </div>
          <div class="status-card offline">
            <div class="status-icon">○</div>
            <div class="status-num">{{ offlineCount }}</div>
            <div class="status-label">离线</div>
          </div>
          <div class="status-card total">
            <div class="status-icon">📱</div>
            <div class="status-num">{{ totalCount }}</div>
            <div class="status-label">设备总数</div>
          </div>
        </div>
      </div>

      <!-- 快捷控制 -->
      <div class="quick-control-section">
        <div class="section-title">快捷控制</div>
        <div class="quick-controls">
          <div 
            v-for="control in quickControls" 
            :key="control.id"
            class="control-item"
            :class="{ active: control.active }"
            @click="toggleControl(control)"
          >
            <div class="control-icon" :style="{ background: control.bgColor }">
              {{ control.icon }}
            </div>
            <div class="control-name">{{ control.name }}</div>
            <div class="control-status">{{ control.active ? '已开启' : '已关闭' }}</div>
          </div>
        </div>
      </div>

      <!-- 常用场景 -->
      <div class="scene-section">
        <div class="section-title">
          <span>常用场景</span>
          <span class="more-btn" @click="$router.push('/scenes')">更多 →</span>
        </div>
        <div class="scene-cards">
          <div 
            v-for="scene in favoriteScenes" 
            :key="scene.id"
            class="scene-card"
            :style="{ background: scene.gradient }"
            @click="activateScene(scene)"
          >
            <div class="scene-icon">{{ scene.icon }}</div>
            <div class="scene-name">{{ scene.name }}</div>
            <div class="scene-desc">{{ scene.description }}</div>
          </div>
          <div v-if="favoriteScenes.length === 0" class="scene-empty">
            <span class="empty-text">暂无常用场景</span>
          </div>
        </div>
      </div>

      <!-- 常用设备快捷控制 -->
      <div class="device-section">
        <div class="section-title">
          <span>常用设备</span>
          <span class="more-btn" @click="$router.push('/devices')">管理 →</span>
        </div>
        
        <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
          <van-list finished>
            <!-- 空状态 -->
            <div v-if="devices.length === 0" class="empty-devices">
              <div class="empty-icon">💡</div>
              <div class="empty-text">暂无常用设备</div>
              <div class="add-device-btn" @click="$router.push('/devices/add')">
                <span class="add-icon">+</span>
                <span>添加设备</span>
              </div>
            </div>
            
            <!-- 设备网格 - 快速开关 -->
            <div v-else class="device-grid">
              <div 
                v-for="device in favoriteDevices" 
                :key="device.id"
                class="device-card"
                :class="{ online: device.online }"
              >
                <div class="device-card-header">
                  <div class="device-icon-wrap" :class="{ online: device.online }">
                    {{ getDeviceIcon(device.type) }}
                  </div>
                  <div class="device-status-dot" :class="{ online: device.online }"></div>
                </div>
                <div class="device-card-name">{{ device.name }}</div>
                <div class="device-card-room">{{ device.room }}</div>
                <div class="device-card-switch" @click.stop="toggleDevice(device)">
                  <van-switch
                    v-model="device.state"
                    size="16px"
                    :loading="device.loading"
                    active-color="#07c160"
                  />
                </div>
              </div>
            </div>
          </van-list>
        </van-pull-refresh>
      </div>
    </div>

    <!-- 底部导航 -->
    <van-tabbar v-model="activeTab" @change="onTabChange" fixed placeholder safe-area-inset-bottom>
      <van-tabbar-item name="home" icon="home-o">首页</van-tabbar-item>
      <van-tabbar-item name="devices" icon="apps-o">设备</van-tabbar-item>
      <van-tabbar-item name="scenes" icon="play-circle-o">场景</van-tabbar-item>
      <van-tabbar-item name="settings" icon="setting-o">设置</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const activeTab = ref('home')
const refreshing = ref(false)
const currentTime = ref('')
const currentDate = ref('')

const user = computed(() => authStore.user)

const userInitials = computed(() => {
  const name = user.value?.name || user.value?.email || '用户'
  return name ? name.charAt(0).toUpperCase() : 'U'
})

// 模拟数据
const devices = ref<any[]>([
  { id: '1', name: '客厅灯', type: 'light', room: '客厅', online: true, state: true, favorite: true },
  { id: '2', name: '卧室空调', type: 'thermostat', room: '卧室', online: true, state: false, favorite: true },
  { id: '3', name: '厨房插座', type: 'outlet', room: '厨房', online: true, state: true, favorite: false },
  { id: '4', name: '门锁', type: 'lock', room: '门口', online: false, state: false, favorite: false },
])

const quickControls = ref([
  { id: 'light', name: '全屋灯光', icon: '💡', active: true, bgColor: 'linear-gradient(135deg, #FFD700, #FFA500)' },
  { id: 'ac', name: '空调', icon: '❄️', active: false, bgColor: 'linear-gradient(135deg, #00BFFF, #1E90FF)' },
  { id: 'fan', name: '风扇', icon: '🌀', active: false, bgColor: 'linear-gradient(135deg, #98FB98, #32CD32)' },
  { id: 'mode', name: '离家模式', icon: '🚗', active: false, bgColor: 'linear-gradient(135deg, #DDA0DD, #9370DB)' },
])

const scenes = ref([
  { id: '1', name: '早安模式', description: '自动开灯+空调', icon: '🌅', gradient: 'linear-gradient(135deg, #FFB347, #FFCC33)', enabled: true },
  { id: '2', name: '影院模式', description: '灯光调暗+音响', icon: '🎬', gradient: 'linear-gradient(135deg, #667eea, #764ba2)', enabled: false },
  { id: '3', name: '睡眠模式', description: '关闭所有设备', icon: '🌙', gradient: 'linear-gradient(135deg, #2c3e50, #3498db)', enabled: true },
  { id: '4', name: '离家模式', description: '关闭所有+安防', icon: '🚗', gradient: 'linear-gradient(135deg, #4CAF50, #81C784)', enabled: true },
])

// 只显示已启用的场景作为常用场景
const favoriteScenes = computed(() => scenes.value.filter(s => s.enabled))

const onlineCount = computed(() => devices.value.filter(d => d.online).length)
const offlineCount = computed(() => devices.value.filter(d => !d.online).length)
const totalCount = computed(() => devices.value.length)

// 只显示标记为常用的设备（最多6个）
const favoriteDevices = computed(() => 
  devices.value.filter(d => d.favorite).slice(0, 6)
)

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 6) return '凌晨好'
  if (hour < 9) return '早上好'
  if (hour < 12) return '上午好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  if (hour < 22) return '晚上好'
  return '夜深了'
})

const weather = computed(() => {
  return '26°C 晴'
})

const getDeviceIcon = (type: string) => {
  const icons: Record<string, string> = {
    light: '💡',
    switch: '🔌',
    sensor: '🌡️',
    camera: '📷',
    thermostat: '❄️',
    lock: '🔒',
    outlet: '🔋',
    ac: '🌬️',
    fan: '🌀',
    generic: '📱'
  }
  return icons[type] || '📱'
}

const goToSettings = () => {
  router.push('/settings')
}

const onTabChange = (name: string) => {
  if (name !== 'home') {
    router.push(`/${name}`)
  }
}

const onRefresh = () => {
  setTimeout(() => {
    refreshing.value = false
    showToast('刷新成功')
  }, 1000)
}

const toggleControl = (control: any) => {
  control.active = !control.active
  showToast(control.active ? `${control.name}已开启` : `${control.name}已关闭`)
}

const activateScene = (scene: any) => {
  showToast(`正在执行${scene.name}`)
}

const toggleDevice = (device: any) => {
  device.loading = true
  setTimeout(() => {
    device.state = !device.state
    device.loading = false
    showToast(device.state ? `${device.name}已开启` : `${device.name}已关闭`)
  }, 500)
}

const updateTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  currentDate.value = now.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })
}

let timeInterval: number

onMounted(() => {
  updateTime()
  timeInterval = window.setInterval(updateTime, 1000)
})

onUnmounted(() => {
  if (timeInterval) clearInterval(timeInterval)
})
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  background: #f5f6f8;
  padding-bottom: 60px;
}

/* 顶部渐变背景 */
.header-gradient {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f64f59 100%);
  padding: 12px 16px 48px;
}

.header-content {
  max-width: 100%;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-top: 8px;
}

.greeting {
  color: white;
}

.app-title {
  font-size: 24px;
  font-weight: 700;
  margin: 0;
  text-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.greeting-text {
  font-size: 14px;
  opacity: 0.9;
  margin-top: 4px;
}

.user-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255,255,255,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: 2px solid rgba(255,255,255,0.4);
  overflow: hidden;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-text {
  font-size: 18px;
  font-weight: 600;
  color: white;
}

/* 时间天气卡片 */
.time-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  padding: 16px 20px;
  background: rgba(255,255,255,0.15);
  border-radius: 16px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.2);
}

.time-info {
  display: flex;
  flex-direction: column;
}

.current-time {
  font-size: 32px;
  font-weight: 700;
  color: white;
  letter-spacing: 1px;
}

.current-date {
  font-size: 13px;
  color: rgba(255,255,255,0.85);
  margin-top: 4px;
}

.weather-info {
  display: flex;
  align-items: center;
  gap: 8px;
  color: white;
}

.weather-icon {
  font-size: 28px;
}

.weather-text {
  font-size: 14px;
}

/* 内容区域 */
.content-area {
  margin-top: -32px;
  padding: 0 16px;
  position: relative;
  z-index: 1;
}

/* 通用标题 */
.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 12px;
}

.more-btn {
  font-size: 13px;
  color: #969799;
  font-weight: 400;
}

/* 设备状态卡片 */
.status-section {
  background: white;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
}

.status-cards {
  display: flex;
  gap: 12px;
  margin-top: 12px;
}

.status-card {
  flex: 1;
  text-align: center;
  padding: 12px 8px;
  border-radius: 12px;
  background: #f7f8fa;
}

.status-card.online {
  background: linear-gradient(135deg, #e6f7e6, #c6ecc6);
}

.status-card.offline {
  background: #f5f5f5;
}

.status-card.total {
  background: linear-gradient(135deg, #e8f4fd, #cce5ff);
}

.status-icon {
  font-size: 20px;
  margin-bottom: 4px;
}

.status-card.online .status-icon {
  color: #07c160;
}

.status-num {
  font-size: 24px;
  font-weight: 700;
  color: #1a1a1a;
}

.status-label {
  font-size: 12px;
  color: #646566;
  margin-top: 2px;
}

/* 快捷控制 */
.quick-control-section {
  background: white;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
}

.quick-controls {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-top: 12px;
}

.control-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 8px;
  border-radius: 12px;
  background: #f7f8fa;
  cursor: pointer;
  transition: all 0.3s;
}

.control-item:active {
  transform: scale(0.95);
}

.control-item.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.control-item.active .control-name,
.control-item.active .control-status {
  color: white;
}

.control-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  margin-bottom: 8px;
  background: rgba(0,0,0,0.05);
}

.control-name {
  font-size: 12px;
  font-weight: 500;
  color: #1a1a1a;
}

.control-status {
  font-size: 11px;
  color: #969799;
  margin-top: 2px;
}

/* 场景模式 */
.scene-section {
  background: white;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
}

.scene-cards {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 8px;
  margin: 0 -4px;
  padding: 4px;
}

.scene-cards::-webkit-scrollbar {
  display: none;
}

.scene-card {
  min-width: 100px;
  padding: 16px;
  border-radius: 16px;
  color: white;
  cursor: pointer;
  transition: transform 0.2s;
}

.scene-card:active {
  transform: scale(0.98);
}

.scene-card.add-scene {
  min-width: 80px;
  background: #f7f8fa;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.add-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}

.add-text {
  font-size: 12px;
  color: #969799;
}

.scene-empty {
  padding: 24px;
  text-align: center;
  color: #969799;
  font-size: 14px;
  background: #f7f8fa;
  border-radius: 12px;
  width: 100%;
}

.scene-icon {
  font-size: 28px;
  margin-bottom: 8px;
}

.scene-name {
  font-size: 14px;
  font-weight: 600;
}

.scene-desc {
  font-size: 11px;
  opacity: 0.85;
  margin-top: 4px;
}

/* 设备列表 */
.device-section {
  background: white;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
}

.device-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.device-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #f7f8fa;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.device-item:active {
  background: #f0f0f0;
}

.device-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.device-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, #f0f0f0, #e0e0e0);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}

.device-icon-wrap.online {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.device-info {
  display: flex;
  flex-direction: column;
}

.device-name {
  font-size: 15px;
  font-weight: 500;
  color: #1a1a1a;
}

.device-location {
  font-size: 12px;
  color: #969799;
  margin-top: 2px;
}

.device-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.device-status {
  font-size: 11px;
  color: #969799;
}

.device-status.online {
  color: #07c160;
}

.empty-icon {
  font-size: 64px;
}

/* 常用设备网格 */
.empty-devices {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 16px;
  background: #f7f8fa;
  border-radius: 12px;
}

.empty-text {
  font-size: 14px;
  color: #969799;
  margin: 12px 0 16px;
}

.add-device-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px;
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.add-device-btn .add-icon {
  font-size: 18px;
  font-weight: 600;
}

/* 设备网格 */
.device-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.device-card {
  background: #f7f8fa;
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: all 0.3s;
}

.device-card.online {
  background: linear-gradient(135deg, #f0f7ff 0%, #e8f4ff 100%);
}

.device-card:active {
  transform: scale(0.98);
}

.device-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.device-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: linear-gradient(135deg, #f0f0f0, #e0e0e0);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.device-icon-wrap.online {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.device-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #dcdee0;
}

.device-status-dot.online {
  background: #07c160;
}

.device-card-name {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 2px;
}

.device-card-room {
  font-size: 12px;
  color: #969799;
  margin-bottom: 10px;
}

.device-card-switch {
  margin-top: auto;
}

.empty-icon {
  font-size: 64px;
}
</style>
