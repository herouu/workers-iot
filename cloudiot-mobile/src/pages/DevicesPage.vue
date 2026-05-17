<template>
  <div class="devices-page">
    <!-- 顶部渐变背景 -->
    <div class="header-bg">
      <div class="header-content">
        <div class="header-top">
          <h1 class="title">我的设备</h1>
          <div class="user-avatar" @click="$router.push('/settings')">
            {{ userName }}
          </div>
        </div>
        
        <!-- 设备统计卡片 -->
        <div class="stats-cards">
          <div class="stat-card online">
            <div class="stat-icon">🟢</div>
            <div class="stat-info">
              <span class="stat-value">{{ onlineCount }}</span>
              <span class="stat-label">在线</span>
            </div>
          </div>
          <div class="stat-card offline">
            <div class="stat-icon">⚫</div>
            <div class="stat-info">
              <span class="stat-value">{{ offlineCount }}</span>
              <span class="stat-label">离线</span>
            </div>
          </div>
          <div class="stat-card total">
            <div class="stat-icon">📱</div>
            <div class="stat-info">
              <span class="stat-value">{{ devices.length }}</span>
              <span class="stat-label">总计</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 筛选标签 -->
    <div class="filter-section">
      <div class="filter-tabs">
        <div 
          class="filter-tab"
          :class="{ active: activeFilter === 'all' }"
          @click="activeFilter = 'all'"
        >
          全部
          <span class="filter-count">{{ devices.length }}</span>
        </div>
        <div 
          class="filter-tab"
          :class="{ active: activeFilter === 'online' }"
          @click="activeFilter = 'online'"
        >
          在线
          <span class="filter-count online">{{ onlineCount }}</span>
        </div>
        <div 
          class="filter-tab"
          :class="{ active: activeFilter === 'offline' }"
          @click="activeFilter = 'offline'"
        >
          离线
          <span class="filter-count offline">{{ offlineCount }}</span>
        </div>
      </div>
    </div>

    <!-- 右下角悬浮添加按钮 -->
    <div class="fab-container" v-if="filteredDevices.length > 0">
      <div class="fab" @click="$router.push('/devices/add')">
        <span class="fab-icon">+</span>
      </div>
    </div>

    <!-- 设备列表 -->
    <div class="device-list-section">
      <van-empty 
        v-if="filteredDevices.length === 0" 
        class="custom-empty"
        image="https://cdn.jsdelivr.net/npm/@vant/assets/custom-empty-image.png"
        image-size="100"
        description="暂无设备，点击添加开始使用"
      >
        <template #default>
          <div class="empty-add-btn" @click="$router.push('/devices/add')">
            <span class="add-icon">+</span>
            <span>添加设备</span>
          </div>
        </template>
      </van-empty>

      <div v-else class="device-list">
        <div 
          v-for="device in filteredDevices" 
          :key="device.id"
          class="device-item"
          :class="{ favorite: device.favorite }"
        >
          <div class="device-item-left" @click="$router.push(`/devices/${device.id}`)">
            <div class="device-icon-wrapper" :class="device.online ? 'online' : 'offline'">
              <span class="device-icon">{{ getDeviceIcon(device.type) }}</span>
            </div>
            
            <div class="device-info">
              <div class="device-name">{{ device.name }}</div>
              <div class="device-location">{{ device.location || '未分组' }}</div>
            </div>
          </div>
          
          <div class="device-actions">
            <!-- 常用标记 -->
            <div 
              class="favorite-btn"
              :class="{ active: device.favorite }"
              @click.stop="toggleFavorite(device)"
            >
              {{ device.favorite ? '★' : '☆' }}
            </div>
            
            <!-- 状态开关 -->
            <van-switch
              :model-value="device.status === 'on'"
              size="20px"
              active-color="#07c160"
              inactive-color="#dcdee0"
              @click.stop
              @change="(val: boolean) => handleDeviceToggle(device, val)"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 底部导航 -->
    <van-tabbar v-model="activeTab" route>
      <van-tabbar-item to="/home" icon-prefix="iconfont">
        <template #icon>
          <span class="iconfont icon-home"></span>
        </template>
        首页
      </van-tabbar-item>
      <van-tabbar-item to="/devices" icon-prefix="iconfont">
        <template #icon>
          <span class="iconfont icon-device"></span>
        </template>
        设备
      </van-tabbar-item>
      <van-tabbar-item to="/scenes" icon-prefix="iconfont">
        <template #icon>
          <span class="iconfont icon-scene"></span>
        </template>
        场景
      </van-tabbar-item>
      <van-tabbar-item to="/settings" icon-prefix="iconfont">
        <template #icon>
          <span class="iconfont icon-settings"></span>
        </template>
        设置
      </van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Device } from '@/types'

const activeFilter = ref('all')
const activeTab = ref('devices')

// 模拟数据
const devices = ref<Device[]>([
  { id: '1', name: '客厅灯', type: 'light', location: '客厅', online: true, status: 'on', favorite: true },
  { id: '2', name: '卧室空调', type: 'ac', location: '卧室', online: true, status: 'off', favorite: true },
  { id: '3', name: '厨房插座', type: 'outlet', location: '厨房', online: true, status: 'on', favorite: false },
  { id: '4', name: '门口门锁', type: 'lock', location: '门口', online: false, status: 'off', favorite: false },
  { id: '5', name: '客厅窗帘', type: 'curtain', location: '客厅', online: true, status: 'off', favorite: false },
  { id: '6', name: '书房风扇', type: 'fan', location: '书房', online: false, status: 'off', favorite: false },
])

const userName = computed(() => {
  const name = localStorage.getItem('userName')
  return name ? name.charAt(0).toUpperCase() : 'U'
})

const filteredDevices = computed(() => {
  if (activeFilter.value === 'online') {
    return devices.value.filter(d => d.online)
  } else if (activeFilter.value === 'offline') {
    return devices.value.filter(d => !d.online)
  }
  return devices.value
})

const onlineCount = computed(() => devices.value.filter(d => d.online).length)
const offlineCount = computed(() => devices.value.filter(d => !d.online).length)

function getDeviceIcon(type: string): string {
  const icons: Record<string, string> = {
    light: '💡',
    ac: '❄️',
    outlet: '🔌',
    lock: '🔒',
    fan: '🌀',
    curtain: '🪟',
    tv: '📺',
    camera: '📹',
    default: '📱'
  }
  return icons[type] || icons.default
}

function handleDeviceToggle(device: Device, value: boolean) {
  device.status = value ? 'on' : 'off'
}

function toggleFavorite(device: Device) {
  device.favorite = !device.favorite
}
</script>

<style scoped>
.devices-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 70px;
}

/* 顶部背景 */
.header-bg {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 48px 16px 24px;
  border-radius: 0 0 24px 24px;
}

.header-content {
  max-width: 600px;
  margin: 0 auto;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.title {
  font-size: 24px;
  font-weight: 600;
  color: #fff;
  margin: 0;
}

.user-avatar {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 600;
  font-size: 16px;
  cursor: pointer;
  backdrop-filter: blur(10px);
}

/* 统计卡片 */
.stats-cards {
  display: flex;
  gap: 12px;
}

.stat-card {
  flex: 1;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.stat-icon {
  font-size: 24px;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
}

.stat-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
}

/* 筛选标签 */
.filter-section {
  margin: -12px 16px 0;
  position: relative;
  z-index: 10;
}

.filter-tabs {
  display: flex;
  background: #fff;
  border-radius: 16px;
  padding: 6px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.filter-tab {
  flex: 1;
  text-align: center;
  padding: 10px 8px;
  border-radius: 12px;
  font-size: 14px;
  color: #666;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.filter-tab.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  font-weight: 600;
}

.filter-count {
  background: rgba(0, 0, 0, 0.08);
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 12px;
}

.filter-tab.active .filter-count {
  background: rgba(255, 255, 255, 0.3);
}

.filter-count.online {
  color: #07c160;
}

.filter-count.offline {
  color: #969799;
}

/* 右下角悬浮按钮 */
.fab-container {
  position: fixed;
  right: 20px;
  bottom: 90px;
  z-index: 100;
}

.fab {
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.5);
  cursor: pointer;
  transition: all 0.3s ease;
}

.fab:active {
  transform: scale(0.95);
}

.fab:hover {
  box-shadow: 0 6px 28px rgba(102, 126, 234, 0.6);
  transform: translateY(-2px);
}

.fab-icon {
  font-size: 32px;
  font-weight: 400;
  color: #fff;
  line-height: 1;
}

/* 设备列表 */
.device-list-section {
  padding: 16px;
}

.custom-empty {
  margin-top: 60px;
}

.empty-add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 24px;
  color: #fff;
  font-weight: 600;
  margin-top: 16px;
  cursor: pointer;
}

.device-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.device-item {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  transition: all 0.3s;
}

.device-item.favorite {
  background: linear-gradient(135deg, #fff9f0 0%, #fff5e6 100%);
  border: 1px solid #ffe4b5;
}

.device-item-left {
  display: flex;
  align-items: center;
  gap: 14px;
  flex: 1;
  cursor: pointer;
}

.device-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.favorite-btn {
  font-size: 20px;
  color: #dcdee0;
  cursor: pointer;
  transition: all 0.2s;
  padding: 4px;
}

.favorite-btn.active {
  color: #ffb700;
  text-shadow: 0 0 8px rgba(255, 183, 0, 0.4);
}

.favorite-btn:active {
  transform: scale(1.2);
}

.device-item:active {
  transform: scale(0.98);
  background: #f8f8f8;
}

.device-icon-wrapper {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
}

.device-icon-wrapper.online {
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
}

.device-icon-wrapper.offline {
  background: linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%);
}

.device-info {
  flex: 1;
}

.device-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.device-location {
  font-size: 13px;
  color: #999;
}

.device-status {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.status-indicator {
  font-size: 12px;
  padding: 3px 8px;
  border-radius: 10px;
}

.status-indicator.online {
  background: #e8f5e9;
  color: #07c160;
}

.status-indicator.offline {
  background: #f5f5f5;
  color: #969799;
}

/* 底部导航 */
:deep(.van-tabbar) {
  background: #fff;
  box-shadow: 0 -2px 20px rgba(0, 0, 0, 0.05);
}

:deep(.van-tabbar-item--active) {
  color: #667eea;
}

:deep(.van-tabbar-item__icon) {
  font-size: 22px;
}
</style>
