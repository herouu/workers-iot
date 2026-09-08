# ESP32 设备接入指南

> 以 ESP32 为例，演示如何接入 cloudiot-backend 物联网平台

---

## 前提条件

### 1. 设备出厂预置

ESP32 固件烧录时写入以下信息（存储在 NVS 或硬编码）：

```
DEVICE_ID  = "esp32-001"        // 设备唯一 ID
DEVICE_SECRET = "a1b2c3d4..."   // 32字节随机密钥（仅设备和云端知晓）
API_HOST    = "https://your-worker.workers.dev"
```

### 2. 云端注册

设备首次使用前，需在 `devices` 表中有对应记录：

```sql
INSERT INTO devices (id, name, type, mac_address, secret_hash, user_id, online)
VALUES ('esp32-001', '客厅温湿度计', 'sensor', 'AA:BB:CC:DD:EE:FF',
        'hashed_secret_here', 'user-123', 0);
```

`secret_hash` = SHA256(DEVICE_SECRET + random_salt)

---

## 完整 Arduino 代码

```cpp
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>

// ============ 设备配置 ============
const char* DEVICE_ID     = "esp32-001";
const char* DEVICE_SECRET = "your-32-byte-device-secret-here";
const char* API_HOST      = "https://your-worker.workers.dev";
const char* WIFI_SSID     = "YourWiFiSSID";
const char* WIFI_PASS     = "YourWiFiPassword";

// ============ 运行时状态 ============
String deviceToken;     // JWT，从云端获取
unsigned long tokenExpiry = 0;
unsigned long lastTelemetry = 0;
unsigned long lastPoll = 0;
const unsigned long TELEMETRY_INTERVAL = 30000;  // 30秒上报
const unsigned long POLL_INTERVAL     = 10000;  // 10秒轮询命令

WiFiClientSecure client;
Preferences prefs;

// ============ 初始化 ============
void setup() {
    Serial.begin(115200);

    // 连接 WiFi
    WiFi.begin(WIFI_SSID, WIFI_PASS);
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println("\nWiFi connected");

    // 跳过 TLS 证书验证（生产环境应使用证书）
    client.setInsecure();

    // 获取设备 Token
    if (!refreshDeviceToken()) {
        Serial.println("Failed to get device token!");
        return;
    }

    Serial.println("Device ready");
}

// ============ 主循环 ============
void loop() {
    // Token 过期刷新
    if (millis() > tokenExpiry) {
        refreshDeviceToken();
    }

    // 定时上报 telemetry
    if (millis() - lastTelemetry > TELEMETRY_INTERVAL) {
        sendTelemetry();
        lastTelemetry = millis();
    }

    // 定时轮询命令
    if (millis() - lastPoll > POLL_INTERVAL) {
        pollCommands();
        lastPoll = millis();
    }
}

// ============ 设备认证：用 secret 换 JWT ============
bool refreshDeviceToken() {
    HTTPClient http;
    String url = String(API_HOST) + "/api/v1/devices/auth";

    http.begin(client, url);
    http.addHeader("Content-Type", "application/json");

    // 构造请求体
    StaticJsonDocument<256> doc;
    doc["device_id"] = DEVICE_ID;
    doc["secret"] = DEVICE_SECRET;
    String body;
    serializeJson(doc, body);

    int code = http.POST(body);
    if (code != 200) {
        Serial.printf("Auth failed: %d\n", code);
        http.end();
        return false;
    }

    // 解析响应
    String response = http.getString();
    StaticJsonDocument<512> resp;
    deserializeJson(resp, response);

    deviceToken = resp["token"].as<String>();
    unsigned long expiresIn = resp["expires_in"].as<unsigned long>();
    tokenExpiry = millis() + (expiresIn * 1000);

    http.end();
    Serial.println("Token refreshed");
    return true;
}

// ============ 上报 Telemetry ============
void sendTelemetry() {
    // 读取传感器数据（示例：温湿度）
    float temperature = readTemperature();
    float humidity = readHumidity();

    HTTPClient http;
    String url = String(API_HOST) + "/realtime/telemetry";

    http.begin(client, url);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("Authorization", "Bearer " + deviceToken);

    // 构造 telemetry payload
    StaticJsonDocument<512> doc;
    doc["device_id"] = DEVICE_ID;

    JsonObject data = doc.createNestedObject("data");
    data["temperature"] = temperature;
    data["humidity"] = humidity;
    data["rssi"] = WiFi.RSSI();
    data["uptime"] = millis() / 1000;

    String body;
    serializeJson(doc, body);

    int code = http.POST(body);
    if (code == 200) {
        Serial.printf("Telemetry sent: %.1f°C, %.1f%%\n", temperature, humidity);
    } else if (code == 401) {
        // Token 过期，下次循环会刷新
        Serial.println("Token expired, will refresh");
    } else {
        Serial.printf("Telemetry failed: %d\n", code);
    }

    http.end();
}

// ============ 轮询命令 ============
void pollCommands() {
    HTTPClient http;
    String url = String(API_HOST) + "/realtime/commands/" + DEVICE_ID + "?since=0";

    http.begin(client, url);
    http.addHeader("Authorization", "Bearer " + deviceToken);

    int code = http.GET();
    if (code != 200) {
        http.end();
        return;
    }

    String response = http.getString();
    http.end();

    // 解析命令列表
    StaticJsonDocument<1024> doc;
    deserializeJson(doc, response);

    JsonArray commands = doc["commands"].as<JsonArray>();
    for (JsonObject cmd : commands) {
        String cmdId = cmd["id"].as<String>();
        String command = cmd["command"].as<String>();
        JsonObject params = cmd["params"].as<JsonObject>();

        // 执行命令
        bool success = executeCommand(command, params);

        // 回执 ACK
        sendAck(cmdId, success);
    }
}

// ============ 执行命令 ============
bool executeCommand(String command, JsonObject params) {
    Serial.printf("Executing: %s\n", command.c_str());

    if (command == "set_led") {
        int brightness = params["brightness"] | 0;
        setLedBrightness(brightness);
        return true;
    }
    else if (command == "reboot") {
        ESP.restart();
        return true;
    }
    else if (command == "set_interval") {
        int interval = params["telemetry_interval"] | 30;
        // 保存到 NVS
        prefs.begin("iot", false);
        prefs.putUInt("interval", interval);
        prefs.end();
        return true;
    }

    return false;
}

// ============ 命令 ACK ============
void sendAck(String cmdId, bool success) {
    HTTPClient http;
    String url = String(API_HOST) + "/realtime/commands/" + DEVICE_ID + "/ack";

    http.begin(client, url);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("Authorization", "Bearer " + deviceToken);

    StaticJsonDocument<256> doc;
    doc["command_id"] = cmdId;
    doc["success"] = success;

    String body;
    serializeJson(doc, body);

    http.POST(body);
    http.end();
}

// ============ 传感器读取（示例） ============
float readTemperature() {
    // 替换为实际传感器读取，如 DHT22、BME280
    return 25.0 + random(-10, 10) / 10.0;
}

float readHumidity() {
    return 50.0 + random(-20, 20) / 10.0;
}

void setLedBrightness(int brightness) {
    // 控制 PWM 等
    Serial.printf("LED brightness: %d\n", brightness);
}
```

---

## 后端需新增的接口

### 1. 设备认证接口

```
POST /api/v1/devices/auth
body: { device_id, secret }

验证: secret_hash == SHA256(secret + salt)
响应: { token: JWT(device_id), expires_in: 3600 }
```

```typescript
// src/handlers/deviceAuthHandler.ts
import { create, verify } from 'jose';

export async function handleDeviceAuth(request: Request, env: Env): Promise<Response> {
    const { device_id, secret } = await request.json();

    // 查设备
    const device = await env.DB.prepare(
        'SELECT * FROM devices WHERE id = ?'
    ).bind(device_id).first();

    if (!device) return new Response('Unauthorized', { status: 401 });

    // 验证 secret
    const secretHash = await sha256(secret + device.salt);
    if (secretHash !== device.secret_hash) {
        return new Response('Unauthorized', { status: 401 });
    }

    // 签发 JWT
    const secretKey = new TextEncoder().encode(env.JWT_SECRET);
    const token = await new CreateProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .setSubject(device_id)
        .sign(secretKey);

    return Response.json({ token, expires_in: 3600 });
}
```

### 2. 设备鉴权中间件

```typescript
// src/middleware/deviceAuth.ts
export async function withDeviceAuth(
    request: Request,
    env: Env
): Promise<{ deviceId: string } | null> {
    const auth = request.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) return null;

    const token = auth.slice(7);
    try {
        const secretKey = new TextEncoder().encode(env.JWT_SECRET);
        const { payload } = await jwtVerify(token, secretKey);
        return { deviceId: payload.sub as string };
    } catch {
        return null;
    }
}
```

### 3. 命令 ACK 接口

```
POST /realtime/commands/:deviceId/ack
body: { command_id, success }
```

```typescript
// 在 routes/realtime.ts 中添加
realtimeRoutes.post('/commands/:deviceId/ack', async (c) => {
    const { command_id, success } = await c.req.json();
    const deviceId = c.req.param('deviceId');

    await c.env.DB.prepare(`
        UPDATE device_commands
        SET status = ?, acked_at = ?
        WHERE id = ? AND device_id = ?
    `).bind(success ? 'acked' : 'failed', Date.now(), command_id, deviceId).run();

    return c.json({ success: true });
});
```

---

## 数据流时序图

```
ESP32                          Cloudflare Worker              D1
  │                                │                          │
  │── POST /devices/auth ─────────→│                          │
  │   {device_id, secret}          │── verify secret ────────→│
  │←── {token, expires_in} ────────│←── device record ───────│
  │                                │                          │
  │── POST /realtime/telemetry ───→│                          │
  │   Authorization: Bearer xxx    │── verify JWT ───────────→│
  │   {temperature, humidity}      │── INSERT device_states ─→│
  │←── 200 OK ────────────────────│                          │
  │                                │                          │
  │── GET /realtime/commands/xxx ─→│                          │
  │   Authorization: Bearer xxx    │── SELECT pending ───────→│
  │←── {commands: [...]} ─────────│←── command list ────────│
  │                                │                          │
  │── POST /realtime/commands/ack ─│                          │
  │   {command_id, success}        │── UPDATE status=acked ─→│
  │←── 200 OK ────────────────────│                          │
```

---

## 生产环境注意事项

### 1. TLS 证书

```cpp
// 生产环境：使用 CA 证书验证
const char* rootCACert = \
"-----BEGIN CERTIFICATE-----\n" \
"MIIDrzCCApegAwIBAgIQCDvgVpBCRrGhdWrJWZHHSjANBgkqhkiG9w0BAQUFADBh\n" \
// ... Cloudflare 根证书
"-----END CERTIFICATE-----\n";

client.setCACert(rootCACert);
```

### 2. NVS 存储配置

```cpp
// 配网后保存 WiFi 凭证到 NVS
void saveWiFiConfig(String ssid, String pass) {
    prefs.begin("wifi", false);
    prefs.putString("ssid", ssid);
    prefs.putString("pass", pass);
    prefs.end();
}

// 启动时读取
String savedSSID = prefs.getString("ssid", "");
```

### 3. OTA 升级

```cpp
// 检查固件版本
void checkOTA() {
    HTTPClient http;
    String url = String(API_HOST) + "/api/v1/devices/" + DEVICE_ID + "/firmware";
    http.begin(client, url);
    http.addHeader("Authorization", "Bearer " + deviceToken);

    http.GET();
    String response = http.getString();
    http.end();

    StaticJsonDocument<256> doc;
    deserializeJson(doc, response);

    String latestUrl = doc["url"].as<String>();
    if (latestUrl.length() > 0) {
        // 执行 OTA
        esp_http_client_config_t config = {
            .url = latestUrl.c_str(),
        };
        esp_ota_http_config_t ota_config = {
            .http_config = &config,
        };
        esp_https_ota(&ota_config);
    }
}
```

### 4. 看门狗

```cpp
// 防止死循环
void setup() {
    // 启用硬件看门狗
    esp_task_wdt_init(60, true);  // 60秒超时
    esp_task_wdt_add(NULL);
}

void loop() {
    esp_task_wdt_reset();  // 喂狗
    // ...
}
```

---

## 调试技巧

### 串口日志

```cpp
#define DEBUG_PRINT(x) Serial.printf("[%lu] %s\n", millis(), x);

DEBUG_PRINT("WiFi connecting...");
DEBUG_PRINT("Token obtained");
DEBUG_PRINT("Telemetry sent");
```

### 模拟设备（无硬件时）

```cpp
// 用 ESP32 开发板直接运行，传感器返回模拟值
float readTemperature() {
    return 20.0 + (rand() % 100) / 10.0;  // 20-30°C
}
```

### 抓包调试

```bash
# 在 Worker 开发环境查看请求日志
wrangler tail
```

---

## 总结

| 步骤 | 操作 |
|---|---|
| 1. 出厂 | 烧录 device_id + secret，云端注册 |
| 2. 上电 | ESP32 连 WiFi |
| 3. 认证 | POST /devices/auth → 获取 JWT |
| 4. 上报 | 每 30s POST /realtime/telemetry |
| 5. 取命令 | 每 10s GET /realtime/commands/:deviceId |
| 6. 执行 | 解析命令 → 执行 → POST ack |

**最小可用闭环 = 认证 + 上报 + 轮询 + ACK**，无需 WebSocket。
