<template>
  <div class="profile-page">
    <!-- 顶部导航 -->
    <div class="nav-bar">
      <span class="back-btn" @click="$router.back()">‹</span>
      <span class="nav-title">账号信息</span>
      <span class="nav-save" @click="handleSave">保存</span>
    </div>

    <!-- 头像区域 -->
    <div class="avatar-section">
      <div class="avatar-wrapper">
        <div class="avatar">
          <span class="avatar-icon">👤</span>
        </div>
        <div class="avatar-edit">
          <span>修改头像</span>
        </div>
      </div>
    </div>

    <!-- 信息表单 -->
    <div class="form-content">
      <div class="form-card">
        <div class="form-item">
          <div class="form-label">用户名</div>
          <input 
            class="form-input" 
            v-model="formData.username" 
            placeholder="请输入用户名"
          />
        </div>
        <div class="form-divider"></div>
        <div class="form-item">
          <div class="form-label">手机号</div>
          <input 
            class="form-input" 
            v-model="formData.phone" 
            placeholder="请输入手机号"
            type="tel"
          />
        </div>
        <div class="form-divider"></div>
        <div class="form-item">
          <div class="form-label">邮箱</div>
          <input 
            class="form-input" 
            v-model="formData.email" 
            placeholder="请输入邮箱"
            type="email"
          />
        </div>
      </div>

      <div class="form-card">
        <div class="form-item">
          <div class="form-label">设备数</div>
          <div class="form-value">{{ stats.deviceCount }} 个</div>
        </div>
        <div class="form-divider"></div>
        <div class="form-item">
          <div class="form-label">场景数</div>
          <div class="form-value">{{ stats.sceneCount }} 个</div>
        </div>
        <div class="form-divider"></div>
        <div class="form-item">
          <div class="form-label">注册时间</div>
          <div class="form-value">{{ stats.regTime }}</div>
        </div>
      </div>

      <!-- 修改密码 -->
      <div class="form-card">
        <div class="form-item arrow-item" @click="showPasswordDialog = true">
          <div class="form-label">修改密码</div>
          <div class="form-arrow">›</div>
        </div>
      </div>
    </div>

    <!-- 密码修改弹窗 -->
    <van-dialog
      v-model:show="showPasswordDialog"
      title="修改密码"
      show-cancel-button
      @confirm="handlePasswordChange"
    >
      <div class="password-form">
        <van-field
          v-model="passwordForm.oldPassword"
          type="password"
          label="原密码"
          placeholder="请输入原密码"
        />
        <van-field
          v-model="passwordForm.newPassword"
          type="password"
          label="新密码"
          placeholder="请输入新密码"
        />
        <van-field
          v-model="passwordForm.confirmPassword"
          type="password"
          label="确认密码"
          placeholder="请再次输入新密码"
        />
      </div>
    </van-dialog>

    <!-- 底部占位 -->
    <div class="tab-bar-placeholder"></div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { showToast } from 'vant'

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
}
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  background: #f5f6f8;
}

.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 48px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  z-index: 100;
}

.back-btn {
  font-size: 28px;
  color: #fff;
  font-weight: 300;
  cursor: pointer;
}

.nav-title {
  font-size: 17px;
  color: #fff;
  font-weight: 500;
}

.nav-save {
  font-size: 15px;
  color: #fff;
  cursor: pointer;
}

.avatar-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 70px 20px 30px;
  display: flex;
  justify-content: center;
}

.avatar-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.avatar {
  width: 80px;
  height: 80px;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid rgba(255, 255, 255, 0.4);
}

.avatar-icon {
  font-size: 40px;
}

.avatar-edit {
  font-size: 13px;
  color: #fff;
  opacity: 0.9;
}

.form-content {
  padding: 20px 16px;
}

.form-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  margin-bottom: 16px;
}

.form-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  min-height: 50px;
  box-sizing: border-box;
}

.form-label {
  font-size: 15px;
  color: #323233;
  flex-shrink: 0;
}

.form-input {
  flex: 1;
  border: none;
  background: transparent;
  text-align: right;
  font-size: 15px;
  color: #646566;
  outline: none;
}

.form-input::placeholder {
  color: #c8c9cc;
}

.form-value {
  font-size: 15px;
  color: #969799;
}

.form-arrow {
  font-size: 20px;
  color: #c8c9cc;
}

.arrow-item {
  cursor: pointer;
}

.arrow-item:active {
  background: #f5f5f5;
}

.form-divider {
  height: 1px;
  background: #ebedf0;
  margin: 0 16px;
}

.password-form {
  padding: 16px 0;
}

.tab-bar-placeholder {
  height: 70px;
}
</style>
