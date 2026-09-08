# CloudIoT 本地网关

旧手机（Termux）上的 IoT 本地网关，提供 HTTP + MQTT 双协议设备接入。

## 特性

- **HTTP API**：设备遥测上报、命令轮询
- **MQTT Broker**：设备长连接、实时命令下发
- **自动注册**：未知设备首次上报自动创建
- **规则引擎**：本地自动化（温度→开风扇）
- **云同步**：与 Cloudflare Worker 双向同步
- **mDNS 发现**：ESP32 自动发现网关
- **数据清理**：自动清理 180 天前数据
- **开机自启**：termux-boot + PM2

## 快速开始

### 1. Termux 环境

```bash
# 安装依赖
pkg update
pkg install nodejs git

# 安装 PM2
npm install -g pm2

# 克隆项目
git clone <repo> ~/cloudiot-local-gateway
cd ~/cloudiot-local-gateway

# 安装依赖
npm install
```

### 2. 配置

```bash
# 编辑环境变量
export CLOUD_API="https://your-worker.workers.dev"
export CLOUD_KEY="your-cloudflare-api-key"
export HTTP_PORT=8080
export MQTT_PORT=1883
```

### 3. 启动

```bash
# 开发模式
npm run dev

# 生产模式（PM2）
npm run pm2:start
pm2 save
pm2 startup
```

### 4. 开机自启

```bash
# 安装 termux:boot (F-Droid)
# 创建启动脚本
mkdir -p ~/.termux/boot
cp .termux/boot.sh ~/.termux/boot/gateway.sh
chmod +x ~/.termux/boot/gateway.sh
```

## API 文档

### 设备

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /api/devices | 设备列表 |
| GET | /api/devices/online | 在线设备 |
| GET | /api/devices/:id | 设备详情 |
| POST | /api/devices | 注册设备 |
| PUT | /api/devices/:id | 更新设备 |
| DELETE | /api/devices/:id | 删除设备 |
| POST | /api/devices/:id/command | 下发命令 |

### 遥测

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | /api/telemetry | 上报遥测 |
| POST | /api/telemetry/batch | 批量上报 |
| GET | /api/telemetry | 查询遥测 |
| GET | /api/telemetry/:deviceId | 设备遥测 |

### 命令

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /api/commands/:deviceId | 轮询命令 |
| POST | /api/commands/:deviceId/ack | 命令回执 |
| GET | /api/commands | 命令列表 |

### 规则

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /api/rules | 规则列表 |
| POST | /api/rules | 创建规则 |
| PUT | /api/rules/:id | 更新规则 |
| POST | /api/rules/:id/toggle | 切换启用 |
| DELETE | /api/rules/:id | 删除规则 |

### 管理

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /api/admin/status | 网关状态 |
| POST | /api/admin/sync | 触发云同步 |
| POST | /api/admin/cleanup | 手动清理 |
| GET | /api/admin/config | 获取配置 |
| PUT | /api/admin/config | 更新配置 |
| POST | /api/admin/restart | 重启网关 |

## MQTT 主题

| 主题 | 方向 | 说明 |
|---|---|---|
| devices/{id}/telemetry | 设备→网关 | 遥测上报 |
| devices/{id}/command | 网关→设备 | 命令下发 |
| devices/{id}/status | 设备→网关 | 在线状态 |
| devices/{id}/ack | 设备→网关 | 命令回执 |

## ESP32 接入示例

### HTTP 模式

```cpp
// 上报遥测
HTTPClient http;
http.begin("http://<gateway-ip>:8080/api/telemetry");
http.addHeader("Content-Type", "application/json");
http.POST("{\"device_id\":\"esp32-001\",\"data\":{\"temperature\":25.5}}");

// 轮询命令
http.begin("http://<gateway-ip>:8080/api/commands/esp32-001");
http.GET();
```

### MQTT 模式

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

  // 上报遥测
  String payload = "{\"data\":{\"temperature\":25.5}}";
  mqtt.publish("devices/esp32-001/telemetry", payload.c_str());
}
```

## 目录结构

```
cloudiot-local-gateway/
├── package.json
├── tsconfig.json
├── ecosystem.config.cjs
├── .termux/boot.sh
├── src/
│   ├── index.ts
│   ├── config.ts
│   ├── server/
│   │   ├── http.ts
│   │   └── mqtt.ts
│   ├── db/
│   │   ├── index.ts
│   │   └── cleanup.ts
│   ├── routes/
│   │   ├── devices.ts
│   │   ├── telemetry.ts
│   │   ├── commands.ts
│   │   ├── rules.ts
│   │   └── admin.ts
│   ├── services/
│   │   ├── rule-engine.ts
│   │   ├── command-dispatcher.ts
│   │   ├── cloud-sync.ts
│   │   └── mdns.ts
│   └── models/
│       ├── device.ts
│       ├── telemetry.ts
│       ├── command.ts
│       └── rule.ts
└── data/
    └── gateway.db
```
