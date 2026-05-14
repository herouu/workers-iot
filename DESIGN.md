# CloudIoT - 物联网平台设计方案

## 1. 平台概述

### 1.1 项目背景

**CloudIoT** 是一款基于 Cloudflare 边缘计算生态的物联网平台，旨在为智能家居、工业控制、场景联动等场景提供安全、稳定、低延迟的设备管理解决方案。平台参考点灯科技（diandeng.tech）的架构理念，实现跨硬件、跨平台的设备接入与控制能力。

### 1.2 核心功能

| 功能模块 | 描述 |
|---------|------|
| 设备管理 | 设备的注册、配网、状态监控、远程控制 |
| 用户系统 | 多方式认证、设备授权、权限管理 |
| 数据存储 | 时序数据存储、历史记录查询、数据分析 |
| 场景联动 | 多设备协同、自动化规则、定时任务 |
| 消息推送 | 实时状态变更通知、告警推送 |
| API 开放 | RESTful API、WebSocket 实时通信 |

### 1.3 技术选型

| 层级 | 技术栈 |
|------|--------|
| **前端 (Web Dashboard)** | Vue 3 + Vite + TailwindCSS + TypeScript |
| **移动端 (Android/iOS)** | Vue 3 + CapacitorJS + Android SDK |
| **后端服务** | Cloudflare Workers (TypeScript) |
| **数据库** | Cloudflare D1 (SQLite) + Durable Objects |
| **缓存/会话** | Cloudflare KV Store |
| **对象存储** | Cloudflare R2 |
| **实时通信** | WebSocket via Durable Objects |
| **CDN/边缘部署** | Cloudflare Pages + Workers |
| **设备接入协议** | HTTP + WebSocket (Cloudflare 原生方案) |

---

## 2. 前端设计方案

### 2.1 技术架构

```
┌─────────────────────────────────────────────────────────┐
│                    Vue 3 Application                     │
├─────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌──────────┐  ┌────────┐  ┌───────────┐  │
│  │ Router  │  │ Pinia   │  │ Axios  │  │ Socket.io │  │
│  │ 4.x     │  │ Store   │  │ Client │  │ Client    │  │
│  └─────────┘  └──────────┘  └────────┘  └───────────┘  │
├─────────────────────────────────────────────────────────┤
│                      UI Components                       │
│  ┌────────┐ ┌─────────┐ ┌────────┐ ┌─────────────────┐  │
│  │Dashboard│ │ Devices │ │ Scenes │ │ Settings/Profile│  │
│  └────────┘ └─────────┘ └────────┘ └─────────────────┘  │
├─────────────────────────────────────────────────────────┤
│                     Cloudflare APIs                      │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌────────┐ │
│  │  Workers  │  │    D1    │  │    KV     │  │   R2   │ │
│  │  (Backend)│  │ (Database)│  │  (Cache)  │  │(Storage)│ │
│  └──────────┘  └──────────┘  └───────────┘  └────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 2.2 目录结构

```
cloudiot-frontend/
├── public/
│   └── favicon.ico
├── src/
│   ├── assets/
│   │   ├── images/
│   │   └── styles/
│   │       └── main.css
│   ├── components/
│   │   ├── common/
│   │   │   ├── AppHeader.vue
│   │   │   ├── AppFooter.vue
│   │   │   ├── LoadingSpinner.vue
│   │   │   └── EmptyState.vue
│   │   ├── device/
│   │   │   ├── DeviceCard.vue
│   │   │   ├── DeviceControl.vue
│   │   │   ├── DeviceList.vue
│   │   │   └── DeviceChart.vue
│   │   ├── scene/
│   │   │   ├── SceneCard.vue
│   │   │   └── SceneEditor.vue
│   │   └── dashboard/
│   │       ├── StatusOverview.vue
│   │       └── QuickActions.vue
│   ├── composables/
│   │   ├── useAuth.ts
│   │   ├── useDevices.ts
│   │   ├── useScenes.ts
│   │   ├── useWebSocket.ts
│   │   └── useCloudflare.ts
│   ├── layouts/
│   │   ├── MainLayout.vue
│   │   └── AuthLayout.vue
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── LoginPage.vue
│   │   │   ├── RegisterPage.vue
│   │   │   └── ForgotPasswordPage.vue
│   │   ├── dashboard/
│   │   │   └── IndexPage.vue
│   │   ├── devices/
│   │   │   ├── DeviceListPage.vue
│   │   │   ├── DeviceDetailPage.vue
│   │   │   └── DeviceAddPage.vue
│   │   ├── scenes/
│   │   │   ├── SceneListPage.vue
│   │   │   └── SceneEditorPage.vue
│   │   ├── data/
│   │   │   └── DataAnalysisPage.vue
│   │   └── settings/
│   │       └── SettingsPage.vue
│   ├── router/
│   │   └── index.ts
│   ├── stores/
│   │   ├── auth.ts
│   │   ├── devices.ts
│   │   └── scenes.ts
│   ├── services/
│   │   ├── api.ts
│   │   ├── deviceService.ts
│   │   ├── authService.ts
│   │   └── wsService.ts
│   ├── types/
│   │   ├── device.ts
│   │   ├── user.ts
│   │   ├── scene.ts
│   │   └── api.ts
│   ├── utils/
│   │   ├── storage.ts
│   │   └── formatters.ts
│   ├── App.vue
│   └── main.ts
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

### 2.3 核心组件说明

#### 2.3.1 设备卡片组件 (`DeviceCard.vue`)

```vue
<script setup lang="ts">
import { computed } from 'vue'
import type { Device } from '@/types/device'

interface Props {
  device: Device
  editable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  editable: true
})

const emit = defineEmits<{
  (e: 'control', deviceId: string, command: string): void
  (e: 'edit', deviceId: string): void
}>()

const statusColor = computed(() => {
  return props.device.online ? 'bg-green-500' : 'bg-gray-400'
})

const togglePower = () => {
  const command = props.device.state.power ? 'off' : 'on'
  emit('control', props.device.id, command)
}
</script>

<template>
  <div class="bg-white rounded-xl shadow-sm p-4">
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <span :class="['w-2 h-2 rounded-full', statusColor]"></span>
        <span class="text-sm text-gray-500">{{ device.online ? '在线' : '离线' }}</span>
      </div>
      <el-dropdown v-if="editable" trigger="click">
        <el-button text circle>
          <svg class="w-5 h-5">...</svg>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item @click="emit('edit', device.id)">编辑</el-dropdown-item>
            <el-dropdown-item divided>删除</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
    
    <div class="text-center py-4">
      <div class="text-4xl mb-2">{{ device.icon }}</div>
      <h3 class="font-medium">{{ device.name }}</h3>
      <p class="text-sm text-gray-500 mt-1">{{ device.room }}</p>
    </div>
    
    <div class="flex gap-2">
      <el-button 
        :type="device.state.power ? 'primary' : 'default'"
        class="flex-1"
        @click="togglePower"
      >
        {{ device.state.power ? '关闭' : '开启' }}
      </el-button>
      <el-button @click="emit('control', device.id, 'settings')">
        设置
      </el-button>
    </div>
  </div>
</template>
```

#### 2.3.2 WebSocket 实时通信 (`useWebSocket.ts`)

```typescript
import { ref, onMounted, onUnmounted } from 'vue'

export function useWebSocket(url: string) {
  const socket = ref<WebSocket | null>(null)
  const connected = ref(false)
  const messages = ref<any[]>([])

  const connect = () => {
    socket.value = new WebSocket(url)
    
    socket.value.onopen = () => {
      connected.value = true
      console.log('WebSocket connected')
    }
    
    socket.value.onmessage = (event) => {
      const data = JSON.parse(event.data)
      messages.value.push(data)
      handleMessage(data)
    }
    
    socket.value.onclose = () => {
      connected.value = false
      // 自动重连
      setTimeout(connect, 3000)
    }
  }

  const send = (data: any) => {
    if (socket.value && connected.value) {
      socket.value.send(JSON.stringify(data))
    }
  }

  const handleMessage = (data: any) => {
    // 处理不同类型的消息
    switch (data.type) {
      case 'device_status':
        // 更新设备状态
        break
      case 'alert':
        // 处理告警
        break
    }
  }

  onMounted(connect)
  
  onUnmounted(() => {
    socket.value?.close()
  })

  return { connected, messages, send }
}
```

---

## 3. 后端设计方案 (Cloudflare Workers)

### 3.1 架构概览

```
┌──────────────────────────────────────────────────────────────┐
│                      Cloudflare Edge                          │
├──────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                   Cloudflare Workers                     │ │
│  │  ┌───────────┐ ┌────────────┐ ┌───────────┐ ┌────────┐ │ │
│  │  │ Auth API  │ │ Device API │ │ Scene API │ │ Data API│ │ │
│  │  └───────────┘ └────────────┘ └───────────┘ └────────┘ │ │
│  └─────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐ │
│  │               Durable Objects (实时通信)                 │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌────────────────┐  │ │
│  │  │ DeviceSession│  │SceneExecutor│  │ NotificationHub│  │ │
│  │  └─────────────┘  └─────────────┘  └────────────────┘  │ │
│  └─────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌─────────────┐  │
│  │    D1    │  │    KV    │  │    R2     │  │ Hyperdrive   │  │
│  │(主数据库) │  │ (缓存)   │  │(文件存储) │  │ (连接传统DB) │  │
│  └──────────┘  └──────────┘  └───────────┘  └─────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 目录结构

```
cloudiot-backend/
├── src/
│   ├── index.ts                 # Workers 入口
│   ├── routes/
│   │   ├── auth.ts              # 认证路由
│   │   ├── devices.ts           # 设备路由
│   │   ├── scenes.ts            # 场景路由
│   │   ├── data.ts              # 数据路由
│   │   └── realtime.ts          # 实时通信路由 (WebSocket + Telemetry)
│   ├── handlers/
│   │   ├── authHandler.ts       # 认证处理
│   │   ├── deviceHandler.ts     # 设备处理
│   │   ├── sceneHandler.ts      # 场景处理
│   │   └── dataHandler.ts       # 数据处理
│   ├── services/
│   │   ├── database.ts          # D1 数据库服务
│   │   ├── cache.ts             # KV 缓存服务
│   │   ├── storage.ts           # R2 存储服务
│   │   └── realtime.ts          # 实时通信服务
│   ├── middleware/
│   │   ├── auth.ts              # 认证中间件
│   │   ├── cors.ts              # CORS 中间件
│   │   └── rateLimit.ts         # 限流中间件
│   ├── durableObjects/
│   │   ├── DeviceSession.ts     # 设备会话 DO
│   │   ├── SceneExecutor.ts     # 场景执行 DO
│   │   ├── NotificationHub.ts   # 通知中心 DO
│   │   └── RealtimeHub.ts       # 实时通信 DO (App/Web 订阅)
│   ├── utils/
│   │   ├── jwt.ts               # JWT 工具
│   │   ├── password.ts          # 密码加密
│   │   └── validation.ts       # 数据验证
│   └── types/
│       ├── device.ts
│       ├── user.ts
│       └── request.ts
├── migrations/
│   └── 001_initial_schema.sql   # 数据库迁移
├── wrangler.toml
├── tsconfig.json
└── package.json
```

### 3.3 核心 API 设计

#### 3.3.1 设备管理 API

```typescript
// src/routes/devices.ts
import { Router } from 'itty-router'
import { getDevices, getDevice, createDevice, updateDevice, deleteDevice, controlDevice } from '../handlers/deviceHandler'
import { requireAuth } from '../middleware/auth'

const router = Router()

// 获取用户的所有设备
router.get('/api/devices', requireAuth, getDevices)

// 获取单个设备详情
router.get('/api/devices/:id', requireAuth, getDevice)

// 创建设备
router.post('/api/devices', requireAuth, createDevice)

// 更新设备
router.put('/api/devices/:id', requireAuth, updateDevice)

// 删除设备
router.delete('/api/devices/:id', requireAuth, deleteDevice)

// 设备控制命令
router.post('/api/devices/:id/control', requireAuth, controlDevice)

// 设备配网
router.post('/api/devices/provision', requireAuth, provisionDevice)

// 获取设备实时数据
router.get('/api/devices/:id/data', requireAuth, getDeviceData)

export { router }
```

#### 3.3.2 数据库 Schema (D1)

```sql
-- migrations/001_initial_schema.sql

-- 用户表
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  avatar TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- 设备表
CREATE TABLE devices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  model TEXT,
  room TEXT,
  icon TEXT DEFAULT '📱',
  mac_address TEXT,
  ip_address TEXT,
  firmware_version TEXT,
  online INTEGER DEFAULT 0,
  last_seen INTEGER,
  config TEXT DEFAULT '{}',
  state TEXT DEFAULT '{}',
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 设备状态历史
CREATE TABLE device_states (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT NOT NULL,
  state TEXT NOT NULL,
  timestamp INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

-- 设备命令表 (用于下发指令)
CREATE TABLE device_commands (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  command TEXT NOT NULL,
  params TEXT DEFAULT '{}',
  timestamp INTEGER DEFAULT (unixepoch()),
  status TEXT DEFAULT 'pending',
  executed_at INTEGER,
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

-- 场景表
CREATE TABLE scenes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '🎬',
  enabled INTEGER DEFAULT 1,
  trigger_config TEXT NOT NULL,
  actions TEXT NOT NULL,
  last_triggered INTEGER,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 场景执行日志
CREATE TABLE scene_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scene_id TEXT NOT NULL,
  status TEXT NOT NULL,
  details TEXT,
  executed_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE CASCADE
);

-- 设备授权表 (用于分享设备)
CREATE TABLE device_shares (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  shared_with TEXT NOT NULL,
  permission TEXT DEFAULT 'control',
  expires_at INTEGER,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
  FOREIGN KEY (shared_with) REFERENCES users(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX idx_devices_user ON devices(user_id);
CREATE INDEX idx_device_states_device ON device_states(device_id);
CREATE INDEX idx_device_states_time ON device_states(timestamp);
CREATE INDEX idx_device_commands_device ON device_commands(device_id);
CREATE INDEX idx_device_commands_status ON device_commands(status);
CREATE INDEX idx_scenes_user ON scenes(user_id);
CREATE INDEX idx_scene_logs_scene ON scene_logs(scene_id);

-- 模拟表 (用于没有真实设备的测试)
CREATE TABLE mock_devices (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  state TEXT DEFAULT '{}'
);
```

#### 3.3.3 设备控制处理器

```typescript
// src/handlers/deviceHandler.ts
import { JsonResponse } from '../utils/response'
import { getDevice, updateDeviceState } from '../services/database'

export async function controlDevice(request: Request, env: Env): Promise<Response> {
  const userId = request.headers.get('x-user-id')
  const { searchParams } = new URL(request.url)
  const deviceId = searchParams.pathname.split('/').pop()
  
  const body = await request.json()
  const { command, params } = body
  
  // 获取设备
  const device = await getDevice(env.DB, deviceId)
  
  if (!device) {
    return new JsonResponse({ error: '设备不存在' }, 404)
  }
  
  // 权限检查
  if (device.user_id !== userId) {
    return new JsonResponse({ error: '无权限控制此设备' }, 403)
  }
  
  // 构建命令
  const cmd = {
    deviceId,
    command,
    params: params || {},
    timestamp: Date.now()
  }
  
  // 通过 Durable Object 实时推送
  const doId = env.DEVICE_SESSION.idFromName(deviceId)
  const doStub = env.DEVICE_SESSION.get(doId)
  await doStub.sendCommand(cmd)
  
  // 更新数据库中的状态 (乐观更新)
  const newState = calculateNewState(device.state, command, params)
  await updateDeviceState(env.DB, deviceId, newState)
  
  return new JsonResponse({
    success: true,
    deviceId,
    command,
    newState
  })
}
```

#### 3.3.4 Durable Object - 设备会话

```typescript
// src/durableObjects/DeviceSession.ts
export class DeviceSession implements DurableObject {
  private state: DurableObjectState
  private clients: WebSocket[] = []
  private deviceId: string
  private latestState: any = {}

  constructor(state: DurableObjectState, env: Env) {
    this.state = state
    this.deviceId = state.id.name
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    
    if (url.pathname === '/ws') {
      // WebSocket 连接
      const { 0: client, 1: server } = new WebSocketPair()
      this.clients.push(client)
      
      // 发送当前状态
      client.send(JSON.stringify({
        type: 'init',
        deviceId: this.deviceId,
        state: this.latestState
      }))
      
      // 清理关闭的连接
      client.addEventListener('close', () => {
        this.clients = this.clients.filter(c => c !== client)
      })
      
      return new Response(null, { webSocket: server })
    }
    
    return new Response('Device Session OK', { status: 200 })
  }

  async sendCommand(cmd: any) {
    // 广播命令给所有连接的客户端
    const message = JSON.stringify({
      type: 'command',
      ...cmd
    })
    
    this.clients.forEach(client => {
      client.send(message)
    })
  }

  async updateState(newState: any) {
    this.latestState = newState
    
    // 广播状态更新
    const message = JSON.stringify({
      type: 'state_update',
      deviceId: this.deviceId,
      state: newState,
      timestamp: Date.now()
    })
    
    this.clients.forEach(client => {
      client.send(message)
    })
    
    // 持久化状态
    await this.state.storage.put('latestState', newState)
  }
}
```

### 3.4 设备接入协议 (Cloudflare 原生方案)

由于 Cloudflare Pub/Sub 已停止服务，平台采用 Cloudflare 原生的 HTTP + WebSocket 方案实现设备通信：

```
┌─────────────────┐    HTTP POST     ┌──────────────────────────┐
│   IoT 设备       │────────────────►│  Cloudflare Workers      │
│ (ESP32/STM32)   │   上报数据        │  /realtime/telemetry     │
└─────────────────┘                  └──────────┬───────────────┘
                                                 │
┌─────────────────┐    WebSocket     ┌──────────▼───────────────┐
│  App/Web 客户端  │◄────────────────►│  Durable Objects        │
│                 │   实时推送        │  RealtimeHub            │
└─────────────────┘                  └──────────┬───────────────┘
                                                 │
                                    ┌───────────▼───────────────┐
                                    │  Cloudflare D1           │
                                    │  device_states           │
                                    │  device_commands         │
                                    └───────────────────────────┘
```

#### 3.4.1 设备数据上报 (HTTP)

```
POST /realtime/telemetry
Content-Type: application/json
Authorization: Bearer <device_token>

{
  "device_id": "device-001",
  "data": {
    "temperature": 25.5,
    "humidity": 60,
    "power": true
  },
  "timestamp": 1736851200000
}
```

#### 3.4.2 App 下发命令 (HTTP)

```
POST /realtime/commands/:deviceId
Content-Type: application/json
Authorization: Bearer <user_token>

{
  "command": "set_power",
  "params": { "power": false }
}
```

#### 3.4.3 设备获取命令 (轮询)

```
GET /realtime/commands/:deviceId?since=1736851200000
```

#### 3.4.4 App 实时订阅 (WebSocket)

```
GET /realtime/ws?token=<jwt_token>
```

### 3.5 wrangler.toml 配置

```toml
name = "cloudiot-backend"
main = "src/index.ts"
compatibility_date = "2025-01-01"

# D1 数据库绑定
[[d1_databases]]
binding = "DB"
database_name = "cloudiot-db"
database_id = "your-database-id"

# KV 命名空间绑定
[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-id"

# R2 存储桶绑定
[[r2_buckets]]
binding = "STORAGE"
bucket_name = "cloudiot-files"

# Durable Objects 类
[[durable_objects.bindings]]
name = "DEVICE_SESSION"
class_name = "DeviceSession"

[[durable_objects.bindings]]
name = "SCENE_EXECUTOR"
class_name = "SceneExecutor"

[[durable_objects.bindings]]
name = "NOTIFICATION_HUB"
class_name = "NotificationHub"

[[durable_objects.bindings]]
name = "REALTIME_HUB"
class_name = "RealtimeHub"

# 环境变量
[vars]
ENVIRONMENT = "production"

# 开发环境覆盖
[env.development]
name = "cloudiot-backend-dev"

[[d1_databases]]
binding = "DB"
database_name = "cloudiot-db-dev"
database_id = "dev-database-id"
```

---

## 4. Android 客户端方案 (CapacitorJS)

### 4.1 技术架构

```
┌─────────────────────────────────────────────────────────┐
│                   Capacitor Android                      │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐   │
│  │              Capacitor Bridge                      │   │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────────┐  │   │
│  │  │  Camera   │ │  Storage  │ │   Geolocation │  │   │
│  │  └───────────┘ └───────────┘ └───────────────┘  │   │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────────┐  │   │
│  │  │   Push    │ │    BLE    │ │    Local      │  │   │
│  │  │ Notifications│ │(蓝牙)    │ │   Notifications│ │   │
│  │  └───────────┘ └───────────┘ └───────────────┘  │   │
│  └─────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│                   Vue 3 Application                       │
│  ┌──────────┐  ┌───────────┐  ┌──────────────────────┐  │
│  │  Pinia   │  │ Vue Router │  │    Capacitor APIs    │  │
│  └──────────┘  └───────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 4.2 项目结构

```
cloudiot-mobile/
├── android/                      # Android 原生项目
│   ├── app/
│   │   └── src/main/
│   │       ├── java/com/cloudiot/mobile/
│   │       └── res/
│   ├── build.gradle
│   └── settings.gradle
├── src/
│   ├── android/                  # Android 原生代码 (如需扩展)
│   │   └── MainActivity.java
│   ├── ios/                      # iOS 相关 (预留)
│   ├── components/              # Vue 组件
│   │   ├── DeviceCard.vue
│   │   ├── SceneCard.vue
│   │   └── StatusIndicator.vue
│   ├── composables/             # Vue Composables
│   │   ├── usePushNotifications.ts
│   │   ├── useLocalStorage.ts
│   │   └── useBLE.ts
│   ├── pages/                   # 页面
│   │   ├── HomePage.vue
│   │   ├── DevicesPage.vue
│   │   ├── DeviceDetailPage.vue
│   │   ├── ScenesPage.vue
│   │   ├── SettingsPage.vue
│   │   └── LoginPage.vue
│   ├── router/
│   │   └── index.ts
│   ├── stores/
│   │   ├── auth.ts
│   │   └── app.ts
│   ├── services/
│   │   ├── api.ts
│   │   └── capacitor/
│   │       ├── notification.ts
│   │       ├── camera.ts
│   │       └── storage.ts
│   ├── App.vue
│   └── main.ts
├── capacitor.config.ts
├── tsconfig.json
├── vite.config.ts
└── package.json
```

### 4.3 核心配置

#### 4.3.1 capacitor.config.ts

```typescript
import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.cloudiot.mobile',
  appName: 'CloudIoT',
  webDir: 'dist',
  server: {
    // 开发时连接本地服务器
    // androidScheme: 'https',
    // url: 'http://192.168.1.100:5173'
  },
  android: {
    backgroundColor: '#ffffff',
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#1890ff',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
      ios: {
        foreground: true,
      },
    },
  },
}

export default config
```

#### 4.3.2 Android Gradle 配置 (build.gradle)

```groovy
// android/app/build.gradle
plugins {
    id 'com.android.application'
}

android {
    namespace 'com.cloudiot.mobile'
    compileSdk 34

    defaultConfig {
        applicationId "com.cloudiot.mobile"
        minSdk 24
        targetSdk 34
        versionCode 1
        versionName "1.0.0"
        
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
        
        vectorDrawables {
            useSupportLibrary true
        }
        
        // 支持 Kotlin
        sourceCompatibility JavaVersion.VERSION_1_8
        targetCompatibility JavaVersion.VERSION_1_8
    }

    buildTypes {
        release {
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
            // 签名配置
            signingConfig signingConfigs.debug
        }
        debug {
            debuggable true
        }
    }
    
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_1_8
        targetCompatibility JavaVersion.VERSION_1_8
    }
}

dependencies {
    implementation 'androidx.core:core-ktx:1.12.0'
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'com.google.android.material:material:1.11.0'
}
```

### 4.4 核心功能实现

#### 4.4.1 推送通知服务

```typescript
// src/services/capacitor/notification.ts
import { PushNotifications, Token, PushNotificationSchema } from '@capacitor/push-notifications'
import { ref } from 'vue'

const notificationPermission = ref<boolean>(false)
const deviceToken = ref<string>('')

export function usePushNotifications() {
  const requestPermission = async () => {
    const result = await PushNotifications.requestPermissions()
    notificationPermission.value = result.receive === 'granted'
    
    if (notificationPermission.value) {
      await registerToken()
    }
    
    return notificationPermission.value
  }

  const registerToken = async () => {
    await PushNotifications.register()
    
    // 获取 token
    PushNotifications.addListener('registration', (token: Token) => {
      deviceToken.value = token.value
      console.log('Push token:', token.value)
      // 将 token 发送到服务器
      sendTokenToServer(token.value)
    })
    
    // 注册失败
    PushNotifications.addListener('registrationError', (error) => {
      console.error('Push registration error:', error)
    })
  }

  const handleNotifications = () => {
    // 收到通知
    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('Push received:', notification)
      // 可以使用本地通知插件显示
    })
    
    // 点击通知
    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Notification action:', notification)
      // 导航到对应页面
    })
  }

  const sendTokenToServer = async (token: string) => {
    // 实现将 token 发送到后端
  }

  return {
    notificationPermission,
    deviceToken,
    requestPermission,
    registerToken,
    handleNotifications,
  }
}
```

#### 4.4.2 首页组件

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useDevicesStore } from '@/stores/devices'
import DeviceCard from '@/components/DeviceCard.vue'

const devicesStore = useDevicesStore()

const onlineDevices = computed(() => 
  devicesStore.devices.filter(d => d.online)
)

const offlineDevices = computed(() => 
  devicesStore.devices.filter(d => !d.online)
)

const quickActions = [
  { icon: '💡', label: '全部开灯', action: 'all_on' },
  { icon: '🔌', label: '全部关灯', action: 'all_off' },
  { icon: '🎬', label: '执行场景', action: 'scene' },
  { icon: '➕', label: '添加设备', action: 'add' },
]
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-20">
    <!-- 状态栏 -->
    <div class="bg-blue-500 text-white p-4 pt-12">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-bold">CloudIoT</h1>
          <p class="text-sm opacity-80">智能生活，尽在掌控</p>
        </div>
        <div class="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
          <span class="text-lg">👤</span>
        </div>
      </div>
    </div>

    <!-- 设备概览 -->
    <div class="p-4">
      <div class="bg-white rounded-xl p-4 shadow-sm mb-4">
        <h2 class="text-lg font-medium mb-3">设备概览</h2>
        <div class="grid grid-cols-3 gap-4 text-center">
          <div>
            <div class="text-2xl font-bold text-green-500">{{ onlineDevices.length }}</div>
            <div class="text-xs text-gray-500">在线</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-gray-400">{{ offlineDevices.length }}</div>
            <div class="text-xs text-gray-500">离线</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-blue-500">{{ devicesStore.devices.length }}</div>
            <div class="text-xs text-gray-500">总计</div>
          </div>
        </div>
      </div>

      <!-- 快捷操作 -->
      <div class="bg-white rounded-xl p-4 shadow-sm mb-4">
        <h2 class="text-lg font-medium mb-3">快捷操作</h2>
        <div class="grid grid-cols-4 gap-3">
          <button 
            v-for="action in quickActions"
            :key="action.action"
            class="flex flex-col items-center p-2 rounded-lg hover:bg-gray-100"
            @click="handleQuickAction(action.action)"
          >
            <div class="text-2xl mb-1">{{ action.icon }}</div>
            <span class="text-xs text-gray-600">{{ action.label }}</span>
          </button>
        </div>
      </div>

      <!-- 设备列表 -->
      <div class="mb-4">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-medium">我的设备</h2>
          <button class="text-blue-500 text-sm" @click="$router.push('/devices')">
            查看全部
          </button>
        </div>
        
        <div v-if="devicesStore.devices.length === 0" class="text-center py-8 text-gray-400">
          <div class="text-4xl mb-2">📱</div>
          <p>暂无设备</p>
          <button class="mt-2 text-blue-500" @click="$router.push('/devices/add')">
            添加第一个设备
          </button>
        </div>
        
        <div v-else class="grid grid-cols-2 gap-3">
          <DeviceCard 
            v-for="device in devicesStore.devices.slice(0, 4)"
            :key="device.id"
            :device="device"
            @control="handleDeviceControl"
          />
        </div>
      </div>
    </div>

    <!-- 底部导航 -->
    <van-tabbar v-model="active" safe-area-inset-bottom>
      <van-tabbar-item icon="home-o">首页</van-tabbar-item>
      <van-tabbar-item icon="apps-o">设备</van-tabbar-item>
      <van-tabbar-item icon="play-circle-o">场景</van-tabbar-item>
      <van-tabbar-item icon="setting-o">设置</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'

export default defineComponent({
  setup() {
    const active = ref(0)
    
    const handleQuickAction = (action: string) => {
      switch (action) {
        case 'all_on':
          // 全部开启
          break
        case 'all_off':
          // 全部关闭
          break
        case 'scene':
          // 选择场景
          break
        case 'add':
          // 添加设备
          break
      }
    }
    
    const handleDeviceControl = (deviceId: string, command: string) => {
      console.log('Control device:', deviceId, command)
    }
    
    return {
      active,
      handleQuickAction,
      handleDeviceControl,
    }
  }
})
</script>
```

### 4.5 构建与部署

#### 4.5.1 构建脚本

```bash
# 安装依赖
npm install

# 开发预览
npm run dev

# 构建 Web 应用
npm run build

# 同步到 Android
npx cap sync android

# 打开 Android Studio
npx cap open android

# 或者直接构建 APK
cd android
./gradlew assembleDebug
```

#### 4.5.2 Dockerfile (可选)

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/android ./android
COPY --from=builder /app/capacitor.config.ts ./

RUN npm install -g @capacitor/cli @capacitor/core @capacitor/android

ENTRYPOINT ["sh"]
```

---

## 5. 设备接入协议 (Cloudflare 原生方案)

### 5.1 HTTP 协议 (设备数据上报)

```typescript
// 设备上报数据
POST /realtime/telemetry
Headers:
  Authorization: Bearer <device_token>
  Content-Type: application/json

Body:
{
  "device_id": "device-001",
  "data": {
    "temperature": 25.5,
    "humidity": 60,
    "battery": 85
  },
  "timestamp": 1736851200000
}

Response:
{
  "success": true,
  "timestamp": 1736851200001
}
```

### 5.2 HTTP 协议 (App 下发命令)

```typescript
// App 下发控制命令
POST /realtime/commands/:deviceId
Headers:
  Authorization: Bearer <user_token>
  Content-Type: application/json

Body:
{
  "command": "set_power",
  "params": { "power": false, "brightness": 50 }
}

Response:
{
  "success": true,
  "commandId": "cmd-uuid-123",
  "timestamp": 1736851200001
}
```

### 5.3 HTTP 协议 (设备轮询获取命令)

```typescript
// 设备轮询获取待执行命令
GET /realtime/commands/:deviceId?since=1736851200000

Response:
{
  "commands": [
    {
      "id": "cmd-uuid-123",
      "command": "set_power",
      "params": { "power": false },
      "timestamp": 1736851200001,
      "status": "pending"
    }
  ],
  "serverTime": 1736851200100
}
```

### 5.4 WebSocket 协议 (App 实时订阅)

```typescript
// WebSocket 连接
wss://your-worker.workers.dev/realtime/ws?token=<jwt>

// 订阅消息类型
// 1. 连接成功
{ "type": "connected", "userId": "user-001", "timestamp": 1736851200000 }

// 2. 心跳
{ "type": "ping" }
{ "type": "pong", "timestamp": 1736851200000 }

// 3. 订阅设备
{ "type": "subscribe", "deviceId": "device-001" }
{ "type": "subscribed", "deviceIds": ["device-001", "device-002"] }

// 4. 设备状态更新推送
{ 
  "type": "device_update",
  "deviceId": "device-001",
  "event": "state_changed",
  "state": { "power": true, "brightness": 80 },
  "timestamp": 1736851200000
}

// 5. 设备遥测数据推送
{
  "type": "device_update",
  "deviceId": "device-001",
  "event": "telemetry",
  "data": { "temperature": 25.5, "humidity": 60 },
  "timestamp": 1736851200000
}

// 6. 命令下发推送
{
  "type": "device_update",
  "deviceId": "device-001",
  "event": "command",
  "data": {
    "commandId": "cmd-uuid-123",
    "command": "set_power",
    "params": { "power": false }
  },
  "timestamp": 1736851200000
}

// 7. 获取所有设备状态
{ "type": "get_states" }
{ 
  "type": "states", 
  "states": {
    "device-001": { "power": true, "brightness": 80 },
    "device-002": { "power": false }
  }
}
```

---

## 6. 安全设计

### 6.1 认证与授权

```typescript
// JWT Token 结构
interface JWTToken {
  sub: string        // 用户 ID
  email: string
  name: string
  iat: number        // 签发时间
  exp: number         // 过期时间
  type: 'access' | 'refresh'
}

// 权限级别
enum Permission {
  VIEW = 'view',           // 查看
  CONTROL = 'control',      // 控制
  CONFIGURE = 'configure', // 配置
  MANAGE = 'manage',        // 管理
}

// 设备分享权限映射
const SHARE_PERMISSIONS = {
  'view': [Permission.VIEW],
  'control': [Permission.VIEW, Permission.CONTROL],
  'manage': [Permission.VIEW, Permission.CONTROL, Permission.CONFIGURE, Permission.MANAGE],
}
```

### 6.2 数据加密

```typescript
// 端到端加密 (用于敏感数据)
const ENCRYPTION = {
  algorithm: 'AES-256-GCM',
  keyDerivation: 'PBKDF2',
  iterations: 100000,
  
  // 设备配对密钥
  devicePairingKeySize: 256,
  
  // 传输加密
  transportEncryption: 'TLS 1.3',
}
```

---

## 7. 部署架构

### 7.1 Cloudflare 部署

```
┌─────────────────────────────────────────────────────────────┐
│                       Cloudflare CDN                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Cloudflare Pages                        │   │
│  │  ┌───────────────┐  ┌─────────────────────────────┐  │   │
│  │  │ Web Dashboard │  │    Capacitor Static Assets   │  │   │
│  │  └───────────────┘  └─────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Cloudflare Workers                      │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │   │
│  │  │  Auth API   │  │  Device API  │  │ Scene API  │  │   │
│  │  └─────────────┘  └──────────────┘  └────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌─────────────┐  ┌────────────────────┐  │
│  │     D1       │  │     KV      │  │   Durable Objects   │  │
│  │  (Database)  │  │   (Cache)   │  │    (Real-time)      │  │
│  └──────────────┘  └─────────────┘  └────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 部署命令

```bash
# 部署后端
cd cloudiot-backend
wrangler deploy

# 部署前端 Web
cd cloudiot-frontend
npm run build
wrangler pages deploy dist --project-name=cloudiot-frontend

# 构建 Android APK
cd cloudiot-mobile
npm run build
npx cap sync android
cd android && ./gradlew assembleRelease
```

---

## 8. 总结

本方案设计了一个基于 Cloudflare 边缘计算生态的物联网平台，核心特点包括：

| 特性 | 描述 |
|------|------|
| **边缘计算** | 所有 API 部署在 Cloudflare Workers，全球低延迟访问 |
| **实时通信** | Durable Objects 提供设备状态实时推送 |
| **数据存储** | D1 作为主数据库，支持时序数据存储 |
| **跨平台** | 一次开发，同时支持 Web 和移动端 (Capacitor) |
| **Cloudflare 原生** | 纯 HTTP + WebSocket，无需第三方 MQTT Broker |
| **安全可靠** | JWT 认证 + 端到端加密 |

平台可扩展性强，可根据实际需求添加更多设备类型、场景联动规则和数据可视化功能。
