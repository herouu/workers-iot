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
- **Local Gateway / 本地网关** - Old Android phone + Termux runs local gateway, works offline / 旧手机 + Termux 运行本地网关，断网可用
- **Tri-channel Mobile App / 三通道移动端** - Auto-fallback Cloud → Local Gateway → Direct BLE (P3 planned) / 云端 → 本地网关 → 近场直连自动降级（P3 规划中）
- **Real-time State Sync / 实时状态同步** - Durable Objects enables real-time device state push / Durable Objects 实现设备状态实时推送
- **Cross-platform Clients / 跨平台客户端** - Capacitor mobile (Android/iOS) / Capacitor 移动端 (Android/iOS)
- **MQTT Protocol Support / MQTT 协议支持** - Standard IoT device access protocol / 标准物联网设备接入协议
- **Scene Automation / 场景自动化** - Flexible device linkage and scheduled tasks / 灵活的设备联动与定时任务

## Technical Architecture / 技术架构

> 三级容灾控制架构：云端在线走云，云端挂了走本地网关，网关全挂走近场直连。
> Three-tier resilient control: Cloud → Local Gateway → Direct (BLE) fallback.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER · Capacitor App                           │
│                                                                             │
│  Control Bus: P1 Cloud  |  P2 Local Gateway  |  P3 Direct BLE (planned)     │
│  api/adapter.ts path translation · auto-fallback P1 -> P2 -> P3             │
└─────────────────────────────────────────────────────────────────────────────┘
          P1 internet/JWT              P2 LAN / no-auth             P3 BLE direct
               |                              |                          |
               v                              v                          v
       ┌──────────────────────┐   ┌────────────────────────┐   ┌────────────┐
       │  CLOUDFLARE EDGE     │   │  LOCAL GATEWAY         │   │  DIRECT    │
       │  (remote gateway)    │   │  Termux local gateway  │   │  BLE       │
       │                      │   │                        │   │            │
       │  Workers REST API    │   │  Hono HTTP :8080       │   │  App <->   │
       │  DO RealtimeHub/     │   │  aedes MQTT :1883      │   │  ESP32     │
       │    DeviceSession     │   │  SQLite · rule engine  │   │  GATT ctrl │
       │  D1 cmd queue/shadows│   │  mDNS · Cloud Sync     │   └────────────┘
       │  KV / R2 · scenes    │   └──────────────┬─────────┘
       └────────────┬─────────┘                  │
                    │ (B) direct cloud link      │ (A) local MQTT link
                    │  HTTPS telemetry+cmd poll  │  devices/{id}/topics
                    v                           v
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DEVICE LAYER · ESP32                           │
├─────────────────────────────────────────────────────────────────────────────┤
│  CH1 MQTT  -> local aedes     CH2 HTTPS -> Cloudflare Worker                │
│     implemented                  planned (esp32-onboarding scheme)          │
│  CH3 BLE GATT server (NimBLE, planned) : near-field fallback, pairing       │
│  unified command state machine · seq re-sync · backoff reconnect            │
│  NVS offline cache & backfill · local rule fallback                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 三级控制链路 / Three-tier Control Paths

| Tier | 路径 Path | 触发条件 When | 链路 Link | 鉴权 Auth | 现状 State |
|------|-----------|---------------|-----------|-----------|------------|
| P1 云端 | App → Cloudflare Worker → ESP32 | 手机在外网，云端在线 | REST/WS → D1 命令队列 → ESP32 轮询 `/realtime/commands/:id`；遥测反向经 `/realtime/telemetry` → DO → App WS 推送 | 用户 JWT + device_secret | ✅ 已实现（移动端 + 后端） |
| P2 本地 | App → Local Gateway → ESP32 | 云端不可达，手机与设备同局域网 | HTTP `:8080/api/devices/:id/command` → 命令分发 → MQTT `devices/{id}/command` | 局域网可信 + device_id + secret | ✅ 已实现（网关 + 移动端） |
| P3 直连 | App --BLE--> ESP32 | 云端 + 本地网关均不可达（近场兜底） | BLE GATT 控制/状态特征 | 配对 + Bonding 加密 | 🚧 规划中 |

### 降级决策 / Fallback Decision

```
检测顺序（手机侧 / App 启动与断线时）：
  ① 云端 API 可达        → P1 云端（人在外网）
  ② ①不可达 && 本地网关 /health 可达 → P2 本地（同一局域网, <10ms）
  ③ ①②不可达 && BLE 扫描到已绑定设备  → P3 直连（近场）

设备侧（ESP32）：
  - 通道①② 常驻并发，互不依赖：本地网关挂仍有云端通道，反之亦然
  - 通道①② 均断线时 BLE 广播常驻，等待 App 近场接入
  - 所有通道只写同一套命令状态机；通道间状态变更全量广播
  - 断线期间事件带 seq 落 NVS，重连后补报对账
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
│   │   ├── api/               # API layer (cloud + local adapter)
│   │   ├── components/        # Vue components / Vue 组件
│   │   ├── pages/             # Page components / 页面组件
│   │   ├── router/            # Router configuration / 路由配置
│   │   ├── stores/            # State management / 状态管理
│   │   │   └── connection.ts  # Cloud/Local mode management
│   │   └── ...
│   ├── android/               # Android native project / Android 项目
│   ├── capacitor.config.ts
│   └── package.json
│
├── cloudiot-local-gateway/    # Local Gateway / 本地网关 (Termux)
│   ├── src/
│   │   ├── index.ts           # Entry: start HTTP + MQTT + Sync
│   │   ├── config.ts          # Environment configuration
│   │   ├── server/
│   │   │   ├── http.ts        # Hono HTTP Server
│   │   │   └── mqtt.ts        # aedes MQTT Broker
│   │   ├── db/
│   │   │   ├── index.ts       # SQLite schema + connection
│   │   │   └── cleanup.ts     # Data retention cleanup
│   │   ├── routes/            # REST API routes
│   │   ├── services/          # Rule engine, command dispatcher, cloud sync, mDNS
│   │   └── models/            # Device, telemetry, command, rule models
│   ├── ecosystem.config.cjs   # PM2 process management
│   ├── .termux/boot.sh       # Boot auto-start script
│   └── package.json
│
└── doc/                       # Documentation / 文档
    ├── offline-resilience.md  # Offline architecture design
    ├── device-onboarding.md   # Device onboarding guide
    └── esp32-onboarding.md    # ESP32 firmware examples
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

### Local Gateway Deployment / 本地网关部署

```bash
# 环境：旧 Android 手机 + Termux (F-Droid 版)
# 手机与设备需在同一 WiFi 局域网

# 1. Termux 安装依赖
pkg update
pkg install nodejs git

# 2. 克隆项目
git clone https://github.com/herouu/workers-iot.git
cd workers-iot/cloudiot-local-gateway

# 3. 安装 Node 依赖
npm install

# 4. 配置环境变量
cp .env.example .env
# 编辑 .env 设置 CLOUD_API 和 CLOUD_KEY（可选，用于云同步）

# 5. 启动（开发模式）
npm run dev

# 6. 生产模式（PM2 进程守护）
npm install -g pm2
npm run pm2:start
pm2 save
pm2 startup
```

#### 开机自启 / Boot Auto-start

```bash
# 安装 termux-boot (F-Droid)
mkdir -p ~/.termux/boot
cp .termux/boot.sh ~/.termux/boot/gateway.sh
chmod +x ~/.termux/boot/gateway.sh
# 手机重启后自动启动网关
```

#### 网关发现 / Gateway Discovery

网关启动后通过 mDNS 广播服务，支持自动发现的客户端可直接连接。也可手动指定网关 IP：

```
http://<gateway-ip>:8080
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

#### 三通道连接 / Tri-channel Connection

移动端支持 **云端 → 本地网关 → 近场直连** 三级自动降级：

- **P1 云端模式**：连接 Cloudflare Worker，需登录，支持远程访问
- **P2 本地模式**：直连局域网网关，无需登录，延迟 <10ms，断网可用
- **P3 直连模式**（规划中）：云端与本地网关均不可达时，App 通过 BLE 直连 ESP32，近场兜底控制

切换路径：`设置 → 连接设置 → 选择模式`（P2 自动检测本地网关 `/health`）

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

---

## Local Gateway / 本地网关

### Features / 特性

- **HTTP + MQTT 双协议** - 设备可通过 HTTP 或 MQTT 接入
- **自动注册** - 未知设备首次上报自动创建
- **规则引擎** - 本地自动化（如温度 > 30°C → 开风扇）
- **命令分发** - MQTT 优先，失败转 HTTP 轮询
- **云同步** - 可选同步到 Cloudflare Worker
- **mDNS 发现** - 支持自动发现网关
- **数据保留** - 自动清理 180 天前数据
- **开机自启** - termux-boot + PM2

### Gateway API / 网关接口

Base URL: `http://<gateway-ip>:8080`

| Method | Path | Description / 描述 |
|--------|------|--------------------|
| GET | `/health` | Health check / 健康检查 |
| GET | `/api/devices` | Device list / 设备列表 |
| GET | `/api/devices/:id` | Device details / 设备详情 |
| POST | `/api/devices` | Register device / 注册设备 |
| PUT | `/api/devices/:id` | Update device / 更新设备 |
| DELETE | `/api/devices/:id` | Delete device / 删除设备 |
| POST | `/api/devices/:id/command` | Send command / 下发命令 |
| POST | `/api/telemetry` | Report telemetry / 上报遥测 |
| POST | `/api/telemetry/batch` | Batch report / 批量上报 |
| GET | `/api/telemetry/:deviceId` | Query telemetry / 查询遥测 |
| GET | `/api/commands/:deviceId` | Poll commands (HTTP) / 轮询命令 |
| POST | `/api/commands/:deviceId/ack` | Command ACK / 命令回执 |
| GET | `/api/rules` | Rule list / 规则列表 |
| POST | `/api/rules` | Create rule / 创建规则 |
| PUT | `/api/rules/:id` | Update rule / 更新规则 |
| DELETE | `/api/rules/:id` | Delete rule / 删除规则 |
| GET | `/api/admin/status` | Gateway status / 网关状态 |
| POST | `/api/admin/sync` | Trigger cloud sync / 触发云同步 |

### MQTT Topics / MQTT 主题

| Topic | Direction | Description / 描述 |
|-------|-----------|--------------------|
| `devices/{id}/telemetry` | Device → Gateway | Telemetry report / 遥测上报 |
| `devices/{id}/command` | Gateway → Device | Command delivery / 命令下发 |
| `devices/{id}/status` | Device → Gateway | Online status / 在线状态 |
| `devices/{id}/ack` | Device → Gateway | Command ACK / 命令回执 |

### Authentication / 鉴权

MQTT 连接使用 `device_id` + `secret`（SHA-256 + 随机盐）认证。HTTP 接口无需鉴权（局域网可信）。

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

### Cloud MQTT Topic Structure / 云端 MQTT 主题结构

```
cloudiot/devices/{deviceId}/cmd      # Device command receiving / 设备接收命令
cloudiot/devices/{deviceId}/status   # Device status reporting / 设备状态上报
cloudiot/users/{userId}/alert        # User alert notifications / 用户告警通知
```

### Local Gateway MQTT / 本地网关 MQTT

```
devices/{deviceId}/telemetry         # Telemetry report / 遥测上报
devices/{deviceId}/command           # Command delivery / 命令下发
devices/{deviceId}/status            # Online status / 在线状态
devices/{deviceId}/ack               # Command ACK / 命令回执
```

### ESP32 接入示例 / ESP32 Example

**HTTP 模式：**

```cpp
// 上报遥测
HTTPClient http;
http.begin("http://<gateway-ip>:8080/api/telemetry");
http.addHeader("Content-Type", "application/json");
http.POST("{\"device_id\":\"esp32-001\",\"data\":{\"temperature\":25.5}}");

// 轮询命令
http.begin("http://<gateway-ip>:8080/api/commands/esp32-001");
int code = http.GET();
```

**MQTT 模式：**

```cpp
#include <PubSubClient.h>

WiFiClient espClient;
PubSubClient mqtt(espClient);

void setup() {
  mqtt.setServer("<gateway-ip>", 1883);
  mqtt.setCallback(callback);
  mqtt.connect("esp32-001", "device-secret");
  mqtt.subscribe("devices/esp32-001/command");
}

void loop() {
  mqtt.loop();
  String payload = "{\"data\":{\"temperature\":25.5}}";
  mqtt.publish("devices/esp32-001/telemetry", payload.c_str());
}
```

## Security Design / 安全设计

- **JWT Authentication / JWT 认证** - Access token + refresh token mechanism (cloud mode) / 访问令牌 + 刷新令牌机制（云端模式）
- **MQTT Authentication / MQTT 认证** - device_id + secret (SHA-256 + random salt) / device_id + secret（SHA-256 + 随机盐）
- **Data Encryption / 数据加密** - AES-256-GCM encryption for sensitive data / 敏感数据 AES-256-GCM 加密
- **Transport Security / 传输安全** - TLS 1.3 encrypted transmission (cloud) / TLS 1.3 加密传输（云端）
- **Local Network Trust / 局域网可信** - Local gateway assumes trusted LAN environment / 本地网关假设局域网可信环境
- **Access Control / 权限控制** - Device-level permission management / 设备级权限管理

## Connection Modes / 连接模式

| Mode | Backend | Auth | Latency | Cloud Down | Gateway Down | Both Down |
|------|---------|------|---------|------------|--------------|-----------|
| P1 Cloud | Cloudflare Worker | JWT | 100ms~2s | — | ✅（设备直连云） | ❌ |
| P2 Local | LAN Gateway | None | <10ms | ✅ | — | ❌ |
| P3 Direct | ESP32 (BLE, 规划中) | Pairing/Bonding | <5ms | ✅ | ✅ | ✅（近场） |

Mobile app auto-detects local gateway and can switch manually via Settings → Connection. P3 requires the phone within BLE range of the device.

## License / 许可证

MIT License

## References / 参考项目

- [Blinker (diandeng.tech) / 点灯科技 (blinker)](https://diandeng.tech/)
- [Cloudflare Workers](https://workers.cloudflare.com/)
- [Capacitor](https://capacitorjs.com/)
