# WorkersIoT - 基于 Cloudflare 的物联网平台

> 适配 Cloudflare 生态的物联网解决方案，支持跨硬件、跨平台设备接入与管理

## 项目简介

WorkersIoT 是一款基于 Cloudflare Workers、D1、Durable Objects 等边缘计算服务的物联网平台，参考点灯科技（blinker）的设计理念，提供设备管理、场景联动、实时监控等核心功能。

### 核心特性

- **边缘计算后端** - Cloudflare Workers 提供全球低延迟 API 服务
- **实时状态同步** - Durable Objects 实现设备状态实时推送
- **跨平台客户端** - Capacitor 移动端 (Android/iOS)
- **MQTT 协议支持** - 标准物联网设备接入协议
- **场景自动化** - 灵活的设备联动与定时任务

## 技术架构

```
┌─────────────────────────────────────────────────────────┐
│                    客户端层                               │
├─────────────────────────────────────────────────────────┤
│            Capacitor Mobile (Vue 3 + Android)           │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│                    Cloudflare Edge                       │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌─────────────┐  ┌────────────────┐  │
│  │   Workers    │  │ Durable Objs │  │    KV Store    │  │
│  │   (API)      │  │  (实时通信)  │  │    (缓存)      │  │
│  └──────────────┘  └─────────────┘  └────────────────┘  │
│  ┌──────────────┐  ┌─────────────┐  ┌────────────────┐  │
│  │      D1      │  │     R2      │  │  Cloudflare    │  │
│  │   (数据库)    │  │   (存储)    │  │     Pages      │  │
│  └──────────────┘  └─────────────┘  └────────────────┘  │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│                    设备层                                │
├─────────────────────────────────────────────────────────┤
│   WiFi 设备  │  BLE 设备  │  ZigBee 设备  │  其他设备    │
└─────────────────────────────────────────────────────────┘
```

## 项目结构

```
workers-iot/
├── cloudiot-backend/          # Cloudflare Workers 后端
│   ├── src/
│   │   ├── index.ts           # 入口文件
│   │   ├── routes/            # 路由定义
│   │   ├── handlers/          # 请求处理
│   │   ├── services/          # 业务服务
│   │   ├── middleware/        # 中间件
│   │   ├── durableObjects/    # Durable Objects 类
│   │   ├── utils/             # 工具函数
│   │   └── types/             # 类型定义
│   ├── migrations/            # 数据库迁移
│   ├── wrangler.toml          # Workers 配置
│   └── package.json
│
├── cloudiot-mobile/           # Capacitor 移动端
    ├── src/
    │   ├── components/        # Vue 组件
    │   ├── composables/       # 组合式函数
    │   ├── pages/             # 页面组件
    │   ├── router/            # 路由配置
    │   ├── stores/            # 状态管理
    │   └── services/          # 服务封装
    ├── android/                # Android 原生项目
    ├── ios/                    # iOS 原生项目 (预留)
    ├── capacitor.config.ts
    └── package.json
```

## 快速开始

### 前置要求

- Node.js >= 18.x
- npm >= 9.x
- Wrangler CLI (`npm install -g wrangler`)
- Android Studio (移动端构建)

### 后端部署

```bash
cd cloudiot-backend

# 安装依赖
npm install

# 本地开发
wrangler dev

# 部署到 Cloudflare
wrangler deploy
```

### Android 客户端

```bash
cd cloudiot-mobile

# 安装依赖
npm install

# 构建 Web 应用
npm run build

# 同步到 Android
npx cap sync android

# 打开 Android Studio
npx cap open android

# 或直接构建 APK
cd android && ./gradlew assembleDebug
```

## API 接口

### 认证接口

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/auth/register` | 用户注册 |
| POST | `/api/auth/login` | 用户登录 |
| POST | `/api/auth/refresh` | 刷新 Token |
| POST | `/api/auth/logout` | 用户登出 |

### 设备接口

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/devices` | 获取设备列表 |
| GET | `/api/devices/:id` | 获取设备详情 |
| POST | `/api/devices` | 创建设备 |
| PUT | `/api/devices/:id` | 更新设备 |
| DELETE | `/api/devices/:id` | 删除设备 |
| POST | `/api/devices/:id/control` | 控制设备 |
| POST | `/api/devices/provision` | 设备配网 |

### 场景接口

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/scenes` | 获取场景列表 |
| POST | `/api/scenes` | 创建场景 |
| PUT | `/api/scenes/:id` | 更新场景 |
| DELETE | `/api/scenes/:id` | 删除场景 |
| POST | `/api/scenes/:id/execute` | 执行场景 |

## 数据模型

### 用户 (users)

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  avatar TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);
```

### 设备 (devices)

```sql
CREATE TABLE devices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  room TEXT,
  icon TEXT DEFAULT '📱',
  online INTEGER DEFAULT 0,
  state TEXT DEFAULT '{}',
  created_at INTEGER DEFAULT (unixepoch())
);
```

### 场景 (scenes)

```sql
CREATE TABLE scenes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  enabled INTEGER DEFAULT 1,
  trigger_config TEXT NOT NULL,
  actions TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);
```

## 协议支持

### MQTT 主题结构

```
cloudiot/devices/{deviceId}/cmd      # 设备接收命令
cloudiot/devices/{deviceId}/status   # 设备状态上报
cloudiot/users/{userId}/alert        # 用户告警通知
```

## 安全设计

- **JWT 认证** - 访问令牌 + 刷新令牌机制
- **数据加密** - 敏感数据 AES-256-GCM 加密
- **传输安全** - TLS 1.3 加密传输
- **权限控制** - 设备级权限管理

## 许可证

MIT License

## 参考项目

- [点灯科技 (blinker)](https://diandeng.tech/)
- [Cloudflare Workers](https://workers.cloudflare.com/)
- [Capacitor](https://capacitorjs.com/)
