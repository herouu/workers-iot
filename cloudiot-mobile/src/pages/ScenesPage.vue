<template>
  <div class="scenes-page">
    <!-- 顶部渐变背景 -->
    <div class="page-header">
      <div class="header-top">
        <span class="back-btn" @click="$router.back()">‹</span>
        <span class="page-title">智能场景</span>
        <span class="header-add" @click="createScene">+</span>
      </div>
      <div class="stats-row">
        <div class="stat-item">
          <span class="stat-num">{{ scenes.length }}</span>
          <span class="stat-label">全部场景</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-num">{{ activeCount }}</span>
          <span class="stat-label">已启用</span>
        </div>
      </div>
    </div>

    <!-- 场景列表 -->
    <div class="scenes-content">
      <!-- 快捷场景 -->
      <div class="section-title">快捷场景</div>
      <div class="quick-scenes">
        <div 
          v-for="scene in quickScenes" 
          :key="scene.id"
          class="quick-card"
          :style="{ background: scene.bgGradient }"
          @click="triggerScene(scene)"
        >
          <div class="quick-icon">{{ scene.icon }}</div>
          <div class="quick-name">{{ scene.name }}</div>
          <div class="quick-desc">{{ scene.description }}</div>
        </div>
      </div>

      <!-- 全部场景 -->
      <div class="section-title">全部场景</div>
      <div class="scene-list">
        <div 
          v-for="scene in scenes" 
          :key="scene.id"
          class="scene-card"
        >
          <div class="scene-left" @click="triggerScene(scene)">
            <div class="scene-icon" :style="{ background: scene.color + '20' }">
              <span class="scene-emoji">{{ scene.icon }}</span>
            </div>
            <div class="scene-info">
              <div class="scene-name">{{ scene.name }}</div>
              <div class="scene-desc">{{ scene.description || '暂无描述' }}</div>
            </div>
          </div>
          <div class="scene-right">
            <div 
              class="scene-toggle"
              :class="{ active: scene.enabled }"
              @click="toggleScene(scene)"
            >
              <div class="toggle-dot"></div>
            </div>
            <span class="scene-status" :class="{ active: scene.enabled }">
              {{ scene.enabled ? '已启用' : '已禁用' }}
            </span>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="scenes.length === 0" class="empty-state">
          <div class="empty-icon">🎭</div>
          <div class="empty-text">暂无场景</div>
          <button class="empty-btn" @click="createScene">创建第一个场景</button>
        </div>
      </div>
    </div>

    <!-- 底部占位 -->
    <div class="tab-bar-placeholder"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { showToast } from 'vant'

interface Scene {
  id: string
  name: string
  description?: string
  icon: string
  color: string
  bgGradient?: string
  enabled: boolean
}

const scenes = ref<Scene[]>([
  { id: '1', name: '早安模式', description: '自动开灯+播放音乐', icon: '🌅', color: '#FF9800', bgGradient: 'linear-gradient(135deg, #FF9800 0%, #FFB74D 100%)', enabled: true },
  { id: '2', name: '离家模式', description: '关闭所有设备+启动安防', icon: '🚗', color: '#4CAF50', bgGradient: 'linear-gradient(135deg, #4CAF50 0%, #81C784 100%)', enabled: true },
  { id: '3', name: '观影模式', description: '调暗灯光+关闭窗帘', icon: '🎬', color: '#9C27B0', bgGradient: 'linear-gradient(135deg, #9C27B0 0%, #CE93D8 100%)', enabled: false },
  { id: '4', name: '睡眠模式', description: '关闭所有灯光', icon: '🌙', color: '#3F51B5', bgGradient: 'linear-gradient(135deg, #3F51B5 0%, #7986CB 100%)', enabled: true },
])

const quickScenes = computed(() => scenes.value.filter(s => s.enabled).slice(0, 4))
const activeCount = computed(() => scenes.value.filter(s => s.enabled).length)

function triggerScene(scene: Scene) {
  showToast(`「${scene.name}」已执行`)
}

function toggleScene(scene: Scene) {
  scene.enabled = !scene.enabled
  showToast(scene.enabled ? '场景已启用' : '场景已禁用')
}

function createScene() {
  showToast('创建场景功能开发中')
}
</script>

<style scoped>
.scenes-page {
  min-height: 100vh;
  background: #f5f6f8;
}

.page-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 48px 20px 24px;
}

.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.back-btn {
  font-size: 28px;
  color: #fff;
  font-weight: 300;
  cursor: pointer;
  width: 32px;
}

.page-title {
  font-size: 18px;
  color: #fff;
  font-weight: 600;
}

.header-add {
  font-size: 28px;
  color: #fff;
  cursor: pointer;
  width: 32px;
  text-align: right;
}

.stats-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 32px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #fff;
}

.stat-num {
  font-size: 24px;
  font-weight: 700;
}

.stat-label {
  font-size: 12px;
  opacity: 0.85;
  margin-top: 2px;
}

.stat-divider {
  width: 1px;
  height: 32px;
  background: rgba(255, 255, 255, 0.3);
}

.scenes-content {
  padding: 20px 16px;
}

.section-title {
  font-size: 13px;
  color: #969799;
  margin-bottom: 12px;
  padding-left: 4px;
}

.quick-scenes {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

.quick-card {
  border-radius: 16px;
  padding: 16px;
  cursor: pointer;
  transition: transform 0.2s;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.quick-card:active {
  transform: scale(0.96);
}

.quick-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.quick-name {
  font-size: 15px;
  font-weight: 600;
  color: #fff;
}

.quick-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.85);
  margin-top: 4px;
}

.scene-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.scene-card {
  background: #fff;
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.scene-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  cursor: pointer;
}

.scene-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.scene-emoji {
  font-size: 22px;
}

.scene-info {
  flex: 1;
  min-width: 0;
}

.scene-name {
  font-size: 15px;
  font-weight: 500;
  color: #323233;
}

.scene-desc {
  font-size: 12px;
  color: #969799;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.scene-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
  margin-left: 12px;
}

.scene-toggle {
  width: 44px;
  height: 26px;
  background: #dcdee0;
  border-radius: 13px;
  position: relative;
  cursor: pointer;
  transition: background 0.3s;
}

.scene-toggle.active {
  background: #07c160;
}

.toggle-dot {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.3s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.scene-toggle.active .toggle-dot {
  transform: translateX(18px);
}

.scene-status {
  font-size: 11px;
  color: #969799;
}

.scene-status.active {
  color: #07c160;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 0;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-text {
  font-size: 14px;
  color: #969799;
  margin-bottom: 20px;
}

.empty-btn {
  padding: 10px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
}

.tab-bar-placeholder {
  height: 70px;
}
</style>
