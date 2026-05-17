<template>
  <div class="settings-page">
    <!-- 顶部渐变背景 -->
    <div class="settings-header">
      <div class="header-content">
        <div class="avatar-section">
          <div class="avatar">
            <span class="avatar-icon">👤</span>
          </div>
          <div class="user-info">
            <div class="username">用户账号</div>
            <div class="user-role">智能家居用户</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 设置选项卡片 -->
    <div class="settings-content">
      <div class="section-title">通用设置</div>
      <div class="settings-card">
        <div class="setting-item" @click="$router.push('/settings/profile')">
          <div class="setting-left">
            <div class="setting-icon account-icon">👤</div>
            <span class="setting-label">账号信息</span>
          </div>
          <div class="setting-arrow">›</div>
        </div>
        <div class="setting-divider"></div>
        <div class="setting-item" @click="handleUpdate">
          <div class="setting-left">
            <div class="setting-icon update-icon">🔄</div>
            <span class="setting-label">检查更新</span>
          </div>
          <div class="setting-value">v1.0.0</div>
        </div>
      </div>

      <div class="section-title">其他</div>
      <div class="settings-card">
        <div class="setting-item" @click="handleAbout">
          <div class="setting-left">
            <div class="setting-icon about-icon">ℹ️</div>
            <span class="setting-label">关于我们</span>
          </div>
          <div class="setting-arrow">›</div>
        </div>
      </div>

      <!-- 退出登录 -->
      <div class="logout-section">
        <button class="logout-btn" @click="handleLogout">
          退出登录
        </button>
      </div>
    </div>

    <!-- 底部导航占位 -->
    <div class="tab-bar-placeholder"></div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { showConfirmDialog, showToast } from 'vant'

const router = useRouter()

function handleAbout() {
  showToast('Workers IoT 智能家居管理系统 v1.0.0')
}

function handleUpdate() {
  showToast('已是最新版本')
}

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

<style scoped>
.settings-page {
  min-height: 100vh;
  background: #f5f6f8;
}

.settings-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 48px 20px 30px;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 72px;
  height: 72px;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(255, 255, 255, 0.4);
}

.avatar-icon {
  font-size: 36px;
}

.user-info {
  text-align: center;
  color: #fff;
}

.username {
  font-size: 18px;
  font-weight: 600;
}

.user-role {
  font-size: 13px;
  opacity: 0.85;
  margin-top: 2px;
}

.settings-content {
  padding: 20px 16px;
}

.section-title {
  font-size: 13px;
  color: #969799;
  margin-bottom: 10px;
  padding-left: 4px;
}

.settings-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.setting-item:active {
  background: #f5f5f5;
}

.setting-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.setting-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.account-icon {
  background: #e8f4ff;
}

.update-icon {
  background: #fff7e6;
}

.about-icon {
  background: #f0f0f0;
}

.setting-label {
  font-size: 15px;
  color: #323233;
}

.setting-value {
  font-size: 14px;
  color: #969799;
}

.setting-arrow {
  font-size: 18px;
  color: #c8c9cc;
}

.setting-divider {
  height: 1px;
  background: #ebedf0;
  margin: 0 16px;
}

.logout-section {
  margin-top: 32px;
}

.logout-btn {
  width: 100%;
  height: 48px;
  background: #fff;
  border: none;
  border-radius: 24px;
  font-size: 16px;
  color: #ee0a24;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.logout-btn:active {
  background: #fff5f5;
}

.tab-bar-placeholder {
  height: 70px;
}
</style>
