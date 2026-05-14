# WorkersIoT - IoT Platform Based on Cloudflare / 基于 Cloudflare 的物联网平台

> An IoT solution adapted for the Cloudflare ecosystem, supporting cross-hardware and cross-platform device access and management
>
> 适配 Cloudflare 生态的物联网解决方案，支持跨硬件、跨平台设备接入与管理

---

## Project Introduction / 项目简介

WorkersIoT is an Internet of Things platform built on Cloudflare Workers, D1, Durable Objects and other edge computing services. Inspired by Blinker (diandeng.tech), it provides core features such as device management, scene automation, and real-time monitoring.

WorkersIoT 是一款基于 Cloudflare Workers、D1、Durable Objects 等边缘计算服务的物联网平台，参考点灯科技（blinker）的设计理念，提供设备管理、场景联动、实时监控等核心功能。

### Core Features / 核心特性

- **Edge Computing Backend / 边缘计算后端** - Cloudflare Workers provides global low-latency API services / Cloudflare Workers 提供全球低延迟 API 服务
- **Real-time State Sync / 实时状态同步** - Durable Objects enables real-time device state push / Durable Objects 实现设备状态实时推送
- **Cross-platform Clients / 跨平台客户端** - Capacitor mobile (Android/iOS) / Capacitor 移动端 (Android/iOS)
- **MQTT Protocol Support / MQTT 协议支持** - Standard IoT device access protocol / 标准物联网设备接入协议
- **Scene Automation / 场景自动化** - Flexible device linkage and scheduled tasks / 灵活的设备联动与定时任务

## Technical Architecture / 技术架构

```
┌─────────────────────────────────────────────────────────┐
│                      Client Layer / 客户端层              │
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
│  │    (API)     │  │  (Real-time) │  │    (Cache)     │  │
│  └──────────────┘  └─────────────┘  └────────────────┘  │
│  ┌──────────────┐  ┌─────────────┐  ┌────────────────┐  │
│  │      D1      │  │     R2      │  │    Cloudflare  │  │
│  │  (Database)  │  │   (Storage) │  │     Pages      │  │
│  └──────────────┘  └─────────────┘  └────────────────┘  │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│                       Device Layer / 设备层               │
├─────────────────────────────────────────────────────────┤
│   WiFi Devices │ BLE Devices │ ZigBee Devices │ Others  │
│   WiFi 设备    │ BLE 设备    │ ZigBee 设备    │ 其他设备  │
└─────────────────────────────────────────────────────────┘
```

## Project Structure / 项目结构

```
workers-iot/
├── cloudiot-backend/          # Cloudflare Workers Backend / 后端
│   ├── src/
│   │   ├── index.ts           # Entry file / 入口文件
│   │   ├── routes/            # Route definitions / 路由定义
│   │   ├── handlers/          # Request handlers / 请求处理
│   │   ├── services/          # Business services / 业务服务
│   │   ├── middleware/         # Middleware / 中间件
│   │   ├── durableObjects/    # Durable Objects classes / DO 类
│   │   ├── utils/             # Utility functions / 工具函数
│   │   └── types/             # Type definitions / 类型定义
│   ├── migrations/            # Database migrations / 数据库迁移
│   ├── wrangler.toml          # Workers configuration / Workers 配置
│   └── package.json
│
├── cloudiot-mobile/           # Capacitor Mobile App / 移动端
│   ├── src/
│   │   ├── components/        # Vue components / Vue 组件
│   │   ├── composables/       # Composables / 组合式函数
│   │   ├── pages/             # Page components / 页面组件
│   │   ├── router/            # Router configuration / 路由配置
│   │   ├── stores/            # State management / 状态管理
│   │   └── services/          # Service layer / 服务封装
│   ├── android/               # Android native project / Android 项目
│   ├── ios/                   # iOS native project (reserved) / iOS 项目 (预留)
│   ├── capacitor.config.ts
│   └── package.json
```

## Quick Start / 快速开始

### Prerequisites / 前置要求

- Node.js >= 18.x
- npm >= 9.x
- Wrangler CLI (`npm install -g wrangler`)
- Android Studio (for mobile build / 移动端构建)

### Backend Deployment / 后端部署

```bash
cd cloudiot-backend

# Install dependencies / 安装依赖
npm install

# Local development / 本地开发
wrangler dev

# Deploy to Cloudflare / 部署到 Cloudflare
wrangler deploy
```

### Android Client / Android 客户端

```bash
cd cloudiot-mobile

# Install dependencies / 安装依赖
npm install

# Build web app / 构建 Web 应用
npm run build

# Sync to Android / 同步到 Android
npx cap sync android

# Open Android Studio / 打开 Android Studio
npx cap open android

# Or build APK directly / 或直接构建 APK
cd android && ./gradlew assembleDebug
```

## API Endpoints / API 接口

### Authentication / 认证接口

| Method | Path | Description / 描述 |
|--------|------|--------------------|
| POST | `/api/auth/register` | User registration / 用户注册 |
| POST | `/api/auth/login` | User login / 用户登录 |
| POST | `/api/auth/refresh` | Refresh token / 刷新 Token |
| POST | `/api/auth/logout` | User logout / 用户登出 |

### Device / 设备接口

| Method | Path | Description / 描述 |
|--------|------|--------------------|
| GET | `/api/devices` | Get device list / 获取设备列表 |
| GET | `/api/devices/:id` | Get device details / 获取设备详情 |
| POST | `/api/devices` | Create device / 创建设备 |
| PUT | `/api/devices/:id` | Update device / 更新设备 |
| DELETE | `/api/devices/:id` | Delete device / 删除设备 |
| POST | `/api/devices/:id/control` | Control device / 控制设备 |
| POST | `/api/devices/provision` | Device provisioning / 设备配网 |

### Scene / 场景接口

| Method | Path | Description / 描述 |
|--------|------|--------------------|
| GET | `/api/scenes` | Get scene list / 获取场景列表 |
| POST | `/api/scenes` | Create scene / 创建场景 |
| PUT | `/api/scenes/:id` | Update scene / 更新场景 |
| DELETE | `/api/scenes/:id` | Delete scene / 删除场景 |
| POST | `/api/scenes/:id/execute` | Execute scene / 执行场景 |

## Data Models / 数据模型

### Users / 用户

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

### Devices / 设备

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

### Scenes / 场景

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

## Protocol Support / 协议支持

### MQTT Topic Structure / MQTT 主题结构

```
cloudiot/devices/{deviceId}/cmd      # Device command receiving / 设备接收命令
cloudiot/devices/{deviceId}/status   # Device status reporting / 设备状态上报
cloudiot/users/{userId}/alert        # User alert notifications / 用户告警通知
```

## Security Design / 安全设计

- **JWT Authentication / JWT 认证** - Access token + refresh token mechanism / 访问令牌 + 刷新令牌机制
- **Data Encryption / 数据加密** - AES-256-GCM encryption for sensitive data / 敏感数据 AES-256-GCM 加密
- **Transport Security / 传输安全** - TLS 1.3 encrypted transmission / TLS 1.3 加密传输
- **Access Control / 权限控制** - Device-level permission management / 设备级权限管理

## License / 许可证

MIT License

## References / 参考项目

- [Blinker (diandeng.tech) / 点灯科技 (blinker)](https://diandeng.tech/)
- [Cloudflare Workers](https://workers.cloudflare.com/)
- [Capacitor](https://capacitorjs.com/)
