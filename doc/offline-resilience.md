# 云平台不可用时的 IoT 离线方案

> 当 Cloudflare Workers 后端不可用时，如何保证 IoT 设备继续运行

---

## 问题分析

### 当前架构的单点故障

```
[ESP32] ──→ [Cloudflare Worker] ──→ [D1]
                ↑
            单点故障：Worker 挂了全断
```

| 故障场景 | 影响 |
|---|---|
| Cloudflare 区域性故障 | 所有设备失联 |
| Worker 部署失败 | API 不可用 |
| D1 数据库故障 | 数据丢失 |
| 网络中断（设备侧） | 设备变砖 |
| 设备到 Cloudflare 网络抖动 | 命令延迟/丢失 |

### 核心需求

1. **本地控制**：断网时设备仍可本地操作（开关、传感器联动）
2. **数据缓存**：断网时数据本地存储，恢复后补传
3. **本地 App 控制**：手机直连设备，不经过云
4. **自动恢复**：网络恢复后自动同步

---

## 方案对比

| 方案 | 复杂度 | 成本 | 适用场景 |
|---|---|---|---|
| A. 本地网关（树莓派） | 中 | ¥300-500 | 智能家居、有本地服务器 |
| B. ESP-NOW 自组网 | 低 | ¥0（纯 ESP） | 小范围、设备间联动 |
| C. ESP32 SoftAP 直连 | 低 | ¥0 | 单设备直连、配网 |
| D. 混合架构（推荐） | 中高 | ¥300-500 | 生产级智能家居 |

---

## 方案 A：本地网关（推荐生产环境）

### 架构

```
                    ┌─────────────────────────────────────┐
                    │         本地网关（树莓派/NAS）          │
                    │  ┌─────────┐ ┌────────┐ ┌────────┐  │
                    │  │ MQTT    │ │ 本地   │ │ 设备   │  │
[ESP32] ──WiFi──→  │  │ Broker  │ │ API    │ │ 注册   │  │
                    │  │ (MQTT)  │ │ Server │ │ 中心   │  │
                    │  └────┬────┘ └───┬────┘ └────────┘  │
                    │       │          │                    │
                    │  ┌────┴──────────┴────┐              │
                    │  │   本地 SQLite/Redis  │              │
                    │  │   （缓存+离线存储）   │              │
                    │  └──────────┬──────────┘              │
                    └─────────────┼─────────────────────────┘
                                  │
                     ┌────────────┴────────────┐
                     │      云同步（可选）       │
                     │  Cloudflare Worker/D1    │
                     └─────────────────────────┘
```

### 本地网关实现（树莓派 + Docker）

```yaml
# docker-compose.yml
version: '3'
services:
  mosquitto:
    image: eclipse-mosquitto:2
    ports:
      - "1883:1883"
      - "9001:9001"
    volumes:
      - ./mosquitto.conf:/mosquitto/config/mosquitto.conf

  local-api:
    build: ./local-api
    ports:
      - "8080:8080"
    environment:
      - MQTT_BROKER=mosquitto
      - DB_PATH=/data/local.db
      - CLOUD_API=https://your-worker.workers.dev
    volumes:
      - ./data:/data

  cloud-sync:
    build: ./cloud-sync
    environment:
      - LOCAL_API=http://local-api:8080
      - CLOUD_API=https://your-worker.workers.dev
      - SYNC_INTERVAL=30
```

### ESP32 连接本地网关

```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include <SPIFFS.h>

// ============ 配置 ============
const char* DEVICE_ID     = "esp32-001";
const char* DEVICE_SECRET = "device-secret";

// 优先连本地网关，失败则尝试云端
const char* LOCAL_MQTT    = "192.168.1.100";    // 树莓派 IP
const char* LOCAL_API     = "http://192.168.1.100:8080";
const char* CLOUD_API     = "https://your-worker.workers.dev";

// ============ 状态 ============
WiFiClient espClient;
PubSubClient mqtt(espClient);

enum ConnectionMode {
    MODE_OFFLINE,       // 完全离线（本地规则）
    MODE_LOCAL,         // 本地网关
    MODE_CLOUD          // 云端
};

ConnectionMode currentMode = MODE_OFFLINE;
unsigned long lastReconnectAttempt = 0;
unsigned long lastCloudSync = 0;

// 本地数据缓存
struct CachedData {
    float temperature;
    float humidity;
    unsigned long timestamp;
};

#define CACHE_SIZE 100
CachedData dataCache[CACHE_SIZE];
int cacheIndex = 0;
int cacheCount = 0;

// ============ 初始化 ============
void setup() {
    Serial.begin(115200);

    // 初始化 SPIFFS（持久化缓存）
    if (!SPIFFS.begin(true)) {
        Serial.println("SPIFFS init failed");
    }

    // 连接 WiFi
    WiFi.begin("YourSSID", "YourPass");
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println("\nWiFi connected");

    // 尝试连接本地网关
    if (connectLocalGateway()) {
        currentMode = MODE_LOCAL;
        Serial.println("Connected to local gateway");
    } else {
        // 尝试云端
        if (connectCloud()) {
            currentMode = MODE_CLOUD;
            Serial.println("Connected to cloud");
        } else {
            currentMode = MODE_OFFLINE;
            Serial.println("Running in offline mode");
        }
    }

    loadCacheFromSPIFFS();
}

// ============ 主循环 ============
void loop() {
    // 维持 MQTT 连接
    if (currentMode == MODE_LOCAL) {
        if (!mqtt.connected()) {
            reconnectMQTT();
        }
        mqtt.loop();
    }

    // 定时上报
    static unsigned long lastReport = 0;
    if (millis() - lastReport > 30000) {
        reportData();
        lastReport = millis();
    }

    // 定时尝试恢复连接
    if (currentMode == MODE_OFFLINE) {
        if (millis() - lastReconnectAttempt > 60000) {
            tryReconnect();
            lastReconnectAttempt = millis();
        }
    }

    // 本地网关模式 → 定期尝试云端同步
    if (currentMode == MODE_LOCAL) {
        if (millis() - lastCloudSync > 300000) {  // 5分钟
            tryCloudSync();
            lastCloudSync = millis();
        }
    }

    // 执行本地规则（无论何种模式）
    executeLocalRules();
}

// ============ 连接本地网关 ============
bool connectLocalGateway() {
    mqtt.setServer(LOCAL_MQTT, 1883);
    mqtt.setCallback(mqttCallback);

    String clientId = "esp32-" + String(DEVICE_ID);
    String willTopic = "devices/" + String(DEVICE_ID) + "/status";

    // Last Will：设备离线时自动发布
    bool connected = mqtt.connect(
        clientId.c_str(),
        ("devices/" + String(DEVICE_ID) + "/command").c_str(),  // 订阅命令
        0,      // QoS
        false,  // retain
        "offline"  // will payload
    );

    if (connected) {
        // 订阅命令主题
        mqtt.subscribe(("devices/" + String(DEVICE_ID) + "/command").c_str());

        // 发布在线状态
        mqtt.publish(("devices/" + String(DEVICE_ID) + "/status").c_str(), "online", true);
    }

    return connected;
}

// ============ MQTT 回调（接收命令） ============
void mqttCallback(char* topic, byte* payload, unsigned int length) {
    String message;
    for (unsigned int i = 0; i < length; i++) {
        message += (char)payload[i];
    }

    Serial.printf("MQTT received [%s]: %s\n", topic, message.c_str());

    // 解析命令
    StaticJsonDocument<256> doc;
    deserializeJson(doc, message);

    String command = doc["command"].as<String>();
    JsonObject params = doc["params"].as<JsonObject>();

    // 执行命令
    bool success = executeCommand(command, params);

    // 回执
    StaticJsonDocument<128> ack;
    ack["command_id"] = doc["id"].as<String>();
    ack["success"] = success;
    String ackStr;
    serializeJson(ack, ackStr);

    mqtt.publish(("devices/" + String(DEVICE_ID) + "/ack").c_str(), ackStr.c_str());
}

// ============ 数据上报 ============
void reportData() {
    float temp = readTemperature();
    float hum = readHumidity();

    StaticJsonDocument<256> doc;
    doc["device_id"] = DEVICE_ID;
    doc["temperature"] = temp;
    doc["humidity"] = hum;
    doc["rssi"] = WiFi.RSSI();
    doc["uptime"] = millis() / 1000;
    doc["mode"] = currentMode == MODE_LOCAL ? "local" :
                  currentMode == MODE_CLOUD ? "cloud" : "offline";

    String payload;
    serializeJson(doc, payload);

    switch (currentMode) {
        case MODE_LOCAL: {
            // 通过 MQTT 上报
            String topic = "devices/" + String(DEVICE_ID) + "/telemetry";
            mqtt.publish(topic.c_str(), payload.c_str());
            break;
        }
        case MODE_CLOUD: {
            // 通过 HTTP 上报到云端
            HTTPClient http;
            http.begin(String(CLOUD_API) + "/realtime/telemetry");
            http.addHeader("Content-Type", "application/json");
            http.addHeader("Authorization", "Bearer " + deviceToken);
            http.POST(payload);
            http.end();
            break;
        }
        case MODE_OFFLINE: {
            // 缓存到本地
            cacheData(temp, hum);
            break;
        }
    }
}

// ============ 数据缓存 ============
void cacheData(float temp, float hum) {
    // 内存缓存
    dataCache[cacheIndex] = {temp, hum, millis() / 1000};
    cacheIndex = (cacheIndex + 1) % CACHE_SIZE;
    if (cacheCount < CACHE_SIZE) cacheCount++;

    // 持久化到 SPIFFS
    File file = SPIFFS.open("/data_cache.json", FILE_APPEND);
    if (file) {
        StaticJsonDocument<128> doc;
        doc["t"] = temp;
        doc["h"] = hum;
        doc["ts"] = millis() / 1000;
        serializeJson(doc, file);
        file.println();
        file.close();
    }

    Serial.printf("Data cached: %.1f°C, %.1f%% (total: %d)\n", temp, hum, cacheCount);
}

// ============ 网络恢复后补传缓存 ============
void syncCachedData() {
    if (cacheCount == 0) return;

    Serial.printf("Syncing %d cached records...\n", cacheCount);

    // 从 SPIFFS 读取缓存
    File file = SPIFFS.open("/data_cache.json", FILE_READ);
    if (!file) return;

    while (file.available()) {
        String line = file.readStringUntil('\n');
        StaticJsonDocument<128> doc;
        if (deserializeJson(doc, line) == DeserializationError::Ok) {
            // 补传
            float t = doc["t"];
            float h = doc["h"];
            unsigned long ts = doc["ts"];

            // 发送到当前可用通道
            if (currentMode == MODE_LOCAL) {
                String topic = "devices/" + String(DEVICE_ID) + "/telemetry";
                mqtt.publish(topic.c_str(), line.c_str());
            } else if (currentMode == MODE_CLOUD) {
                HTTPClient http;
                http.begin(String(CLOUD_API) + "/realtime/telemetry/batch");
                http.addHeader("Content-Type", "application/json");
                http.addHeader("Authorization", "Bearer " + deviceToken);
                http.POST(line);
                http.end();
            }
        }
    }
    file.close();

    // 清空缓存
    SPIFFS.remove("/data_cache.json");
    cacheCount = 0;
    cacheIndex = 0;

    Serial.println("Cache synced");
}

// ============ 本地规则引擎 ============
void executeLocalRules() {
    // 从 SPIFFS 加载本地规则
    File rulesFile = SPIFFS.open("/rules.json", FILE_READ);
    if (!rulesFile) return;

    StaticJsonDocument<1024> rules;
    deserializeJson(rules, rulesFile);
    rulesFile.close();

    JsonArray ruleList = rules["rules"].as<JsonArray>();
    for (JsonObject rule : ruleList) {
        String condition = rule["condition"].as<String>();
        String action = rule["action"].as<String>();

        // 简单规则示例
        if (condition == "temperature > 30") {
            float temp = readTemperature();
            if (temp > 30.0) {
                // 执行动作（如开风扇）
                executeCommand(action, JsonObject());
            }
        }
        else if (condition == "humidity < 30") {
            float hum = readHumidity();
            if (hum < 30.0) {
                executeCommand(action, JsonObject());
            }
        }
    }
}

// ============ 连接恢复 ============
void tryReconnect() {
    Serial.println("Trying to reconnect...");

    // 先尝试本地网关
    if (connectLocalGateway()) {
        currentMode = MODE_LOCAL;
        Serial.println("Reconnected to local gateway");
        syncCachedData();
        return;
    }

    // 再尝试云端
    if (connectCloud()) {
        currentMode = MODE_CLOUD;
        Serial.println("Reconnected to cloud");
        syncCachedData();
        return;
    }

    Serial.println("Reconnect failed, staying offline");
}

// ============ 传感器读取 ============
float readTemperature() {
    return 25.0 + random(-10, 10) / 10.0;
}

float readHumidity() {
    return 50.0 + random(-20, 20) / 10.0;
}

bool executeCommand(String command, JsonObject params) {
    Serial.printf("Executing: %s\n", command.c_str());
    // 执行本地动作...
    return true;
}

void loadCacheFromSPIFFS() {
    if (SPIFFS.exists("/data_cache.json")) {
        File file = SPIFFS.open("/data_cache.json", FILE_READ);
        if (file) {
            cacheCount = 0;
            while (file.available()) {
                file.readStringUntil('\n');
                cacheCount++;
            }
            file.close();
            Serial.printf("Loaded %d cached records from SPIFFS\n", cacheCount);
        }
    }
}

bool connectCloud() {
    // 尝试连接云端...
    return false;  // 简化
}

void reconnectMQTT() {
    if (millis() - lastReconnectAttempt > 5000) {
        lastReconnectAttempt = millis();
        connectLocalGateway();
    }
}

void tryCloudSync() {
    // 尝试云端同步...
}
```

---

## 方案 B：ESP-NOS 自组网（无网关）

### 架构

```
[ESP32-1] ←──ESP-NOW──→ [ESP32-2] ←──ESP-NOW──→ [ESP32-3]
    │                        │                        │
    └────── 设备间直接通信 ────┴────── 无需云端 ─────────┘
```

### ESP-NOW 点对点通信

```cpp
#include <esp_now.h>
#include <WiFi.h>

// 对端设备 MAC 地址
uint8_t peerMAC[] = {0xAA, 0xBB, 0xCC, 0xDD, 0xEE, 0xFF};

// 消息结构
typedef struct {
    char device_id[16];
    char command[32];
    float value;
    unsigned long timestamp;
} Message;

// 发送回调
void onSent(const uint8_t *mac_addr, esp_now_send_status_t status) {
    Serial.printf("Send status: %s\n",
        status == ESP_NOW_SEND_SUCCESS ? "success" : "fail");
}

// 接收回调
void onReceive(const uint8_t *mac, const uint8_t *data, int len) {
    Message msg;
    memcpy(&msg, data, sizeof(msg));
    Serial.printf("Received from %s: %s = %.1f\n",
        msg.device_id, msg.command, msg.value);

    // 执行联动
    if (strcmp(msg.command, "motion_detected") == 0) {
        // 有人移动 → 开灯
        setLed(true);
    }
}

void setup() {
    Serial.begin(115200);
    WiFi.mode(WIFI_STA);

    if (esp_now_init() != ESP_OK) {
        Serial.println("ESP-NOW init failed");
        return;
    }

    esp_now_register_send_cb(onSent);
    esp_now_register_recv_cb(onReceive);

    // 添加对端
    esp_now_peer_info_t peerInfo = {};
    memcpy(peerInfo.peer_addr, peerMAC, 6);
    peerInfo.channel = 0;
    peerInfo.encrypt = false;
    esp_now_add_peer(&peerInfo);
}

void sendToPeer(const char* cmd, float value) {
    Message msg;
    strncpy(msg.device_id, "esp32-001", 16);
    strncpy(msg.command, cmd, 32);
    msg.value = value;
    msg.timestamp = millis();

    esp_now_send(peerMAC, (uint8_t*)&msg, sizeof(msg));
}

void loop() {
    // 检测到移动 → 通知其他设备
    if (digitalRead(PIR_PIN) == HIGH) {
        sendToPeer("motion_detected", 1.0);
    }
    delay(1000);
}
```

---

## 方案 C：ESP32 SoftAP 直连（手机直控）

### 架构

```
[手机 App] ←──WiFi──→ [ESP32 SoftAP] ←──GPIO──→ [继电器/传感器]
                          │
                     无需任何网络
```

### SoftAP + Web Server

```cpp
#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>

const char* SOFTAP_SSID = "ESP32-IoT";
const char* SOFTAP_PASS = "12345678";

WebServer server(80);

void setup() {
    Serial.begin(115200);

    // 启动 SoftAP
    WiFi.softAP(SOFTAP_SSID, SOFTAP_PASS);
    Serial.printf("AP IP: %s\n", WiFi.softAPIP().toString().c_str());

    // API 路由
    server.on("/api/status", HTTP_GET, handleStatus);
    server.on("/api/control", HTTP_POST, handleControl);
    server.on("/api/config", HTTP_POST, handleConfig);

    server.begin();
}

void loop() {
    server.handleClient();
}

void handleStatus() {
    StaticJsonDocument<256> doc;
    doc["device_id"] = "esp32-001";
    doc["temperature"] = readTemperature();
    doc["humidity"] = readHumidity();
    doc["led_state"] = digitalRead(LED_PIN);
    doc["uptime"] = millis() / 1000;

    String response;
    serializeJson(doc, response);
    server.send(200, "application/json", response);
}

void handleControl() {
    String body = server.arg("plain");
    StaticJsonDocument<256> doc;
    deserializeJson(doc, body);

    String action = doc["action"].as<String>();

    if (action == "led_on") {
        digitalWrite(LED_PIN, HIGH);
    } else if (action == "led_off") {
        digitalWrite(LED_PIN, LOW);
    }

    server.send(200, "application/json", "{\"success\":true}");
}

void handleConfig() {
    String body = server.arg("plain");
    // 保存配置到 SPIFFS...
    server.send(200, "application/json", "{\"success\":true}");
}
```

---

## 方案 D：混合架构（推荐生产）

### 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        本地网络                               │
│                                                              │
│  [ESP32-1]  [ESP32-2]  [ESP32-3]        [手机 App]          │
│      │          │          │                 │               │
│      └──────────┴──────────┘                 │               │
│                 │                            │               │
│         ┌───────┴───────┐            ┌───────┴───────┐      │
│         │  本地网关      │            │  SoftAP 直连   │      │
│         │  (MQTT+API)   │            │  (备用控制)    │      │
│         └───────┬───────┘            └───────────────┘      │
│                 │                                            │
│         ┌───────┴───────┐                                    │
│         │  本地 SQLite   │                                    │
│         │  (缓存+规则)   │                                    │
│         └───────┬───────┘                                    │
│                 │                                            │
└─────────────────┼────────────────────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │   云同步（可选）    │
        │  Cloudflare Worker │
        └───────────────────┘
```

### 模式切换逻辑

```cpp
enum SystemMode {
    MODE_OFFLINE,       // 完全离线：本地规则 + 缓存
    MODE_LOCAL_GATEWAY, // 本地网关：MQTT + 本地 API
    MODE_CLOUD,         // 云端：HTTP + D1
    MODE_SOFTAP         // SoftAP：手机直连
};

SystemMode detectMode() {
    // 1. 检查本地网关是否可达
    if (ping(LOCAL_MQTT)) {
        return MODE_LOCAL_GATEWAY;
    }

    // 2. 检查云端是否可达
    if (ping(CLOUD_API)) {
        return MODE_CLOUD;
    }

    // 3. 检查手机是否直连 SoftAP
    if (WiFi.getMode() == WIFI_AP) {
        return MODE_SOFTAP;
    }

    // 4. 完全离线
    return MODE_OFFLINE;
}
```

---

## 本地规则引擎（离线核心）

### 规则存储（SPIFFS /rules.json）

```json
{
    "rules": [
        {
            "id": "rule-001",
            "name": "高温开风扇",
            "enabled": true,
            "condition": {
                "type": "threshold",
                "sensor": "temperature",
                "operator": ">",
                "value": 30.0
            },
            "action": {
                "type": "gpio",
                "pin": 4,
                "value": 1
            }
        },
        {
            "id": "rule-002",
            "name": "湿度低开加湿器",
            "enabled": true,
            "condition": {
                "type": "threshold",
                "sensor": "humidity",
                "operator": "<",
                "value": 30.0
            },
            "action": {
                "type": "mqtt",
                "topic": "devices/humidifier/command",
                "payload": "{\"action\":\"turn_on\"}"
            }
        },
        {
            "id": "rule-003",
            "name": "人体感应开灯",
            "enabled": true,
            "condition": {
                "type": "gpio",
                "pin": 5,
                "value": 1
            },
            "action": {
                "type": "gpio",
                "pin": 4,
                "value": 1
            }
        }
    ]
}
```

### 规则执行

```cpp
void executeRules() {
    File file = SPIFFS.open("/rules.json", FILE_READ);
    if (!file) return;

    StaticJsonDocument<2048> doc;
    deserializeJson(doc, file);
    file.close();

    JsonArray rules = doc["rules"].as<JsonArray>();
    for (JsonObject rule : rules) {
        if (!rule["enabled"].as<bool>()) continue;

        JsonObject condition = rule["condition"];
        String type = condition["type"].as<String>();

        bool triggered = false;

        if (type == "threshold") {
            float value = readSensor(condition["sensor"].as<String>());
            float threshold = condition["value"].as<float>();
            String op = condition["operator"].as<String>();

            if (op == ">") triggered = value > threshold;
            else if (op == "<") triggered = value < threshold;
            else if (op == "==") triggered = value == threshold;
        }
        else if (type == "gpio") {
            int pin = condition["pin"].as<int>();
            int expected = condition["value"].as<int>();
            triggered = digitalRead(pin) == expected;
        }

        if (triggered) {
            JsonObject action = rule["action"];
            executeAction(action);
        }
    }
}
```

---

## 总结

| 场景 | 推荐方案 | 关键能力 |
|---|---|---|
| 单设备、偶尔断网 | 方案 C（SoftAP） | 手机直连控制 |
| 多设备、小范围 | 方案 B（ESP-NOW） | 设备间联动 |
| 家庭/办公室 | 方案 A（本地网关） | 完整本地控制 |
| 生产级智能家居 | 方案 D（混合） | 自动切换 + 本地规则 + 云同步 |

### 核心原则

1. **本地优先**：关键控制（开关、传感器联动）不依赖云
2. **缓存补传**：断网时本地存储，恢复后自动同步
3. **降级 gracefully**：云不可用时自动切换到本地模式
4. **规则本地化**：基础自动化规则存储在设备/网关本地
5. **手机直连**：提供 SoftAP 作为最后手段的控制通道

---

## 在线模式：完整数据链路（网络正常时）

### 架构全景

```
                        互联网
                          │
                   ┌──────┴──────┐
                   │ Cloudflare  │
                   │ Worker + D1 │
  远程手机 App ←───│             │───→ 远程访问/OTA/数据分析
                   └──────┬──────┘
                          │（云同步，非阻塞本地控制）
┌─────────────────────────┼─────────────────────────────────────┐
│                     本地网络                                    │
│                         │                                      │
│                  ┌──────┴──────┐                               │
│                  │  本地网关     │                               │
│                  │ 树莓派/NAS    │                               │
│                  │              │                               │
│  ┌───────────────┼──────────────┼────────────────┐             │
│  │  MQTT Broker  │  Local API   │  Cloud Sync    │             │
│  │  :1883        │  :8080       │  同步服务       │             │
│  └───────┬───────┴──────┬───────┴────────┬───────┘             │
│          │              │                │                      │
│     ┌────┴────┐    ┌────┴────┐     ┌─────┴──────┐              │
│     │ ESP32-1 │    │ ESP32-2 │     │ 手机 App   │              │
│     │ 传感器  │    │ 开关    │     │ （本地WiFi）│              │
│     └─────────┘    └─────────┘     └────────────┘              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 通信协议矩阵

| 链路 | 协议 | 说明 |
|---|---|---|
| ESP32 ↔ 本地网关 | MQTT（发布/订阅） | 低延迟、双向、QoS 保障 |
| 手机 App ↔ 本地网关 | HTTP REST | 标准 API，手机友好 |
| 本地网关 → 云端 | HTTP（异步批量） | 数据同步，不阻塞本地 |
| 云端 → 本地网关 | HTTP（长轮询/WebSocket） | 远程命令下发 |
| ESP32 ↔ ESP32 | ESP-NOW | 设备间直连联动，不经过网关 |
| 手机 ↔ ESP32（备选） | SoftAP HTTP | 无网络时直连 |

### 时序 1：设备启动 → 认证 → 上线

```
ESP32                          本地网关                    云端
  │                              │                        │
  │── WiFi 连接 ──→              │                        │
  │                              │                        │
  │── MQTT CONNECT ───────────→  │                        │
  │   client_id: esp32-001       │                        │
  │   username: device           │                        │
  │   password: device_token     │                        │
  │                              │                        │
  │←── CONNACK (accepted) ──────│                        │
  │                              │                        │
  │── PUBLISH devices/esp32-001/status ──→               │
  │   payload: {"state":"online"}                        │
  │                              │                        │
  │── SUBSCRIBE devices/esp32-001/command ──→           │
  │                              │                        │
  │                              │── 同步设备上线 ──────→ │
  │                              │                        │── 更新 D1 devices.online=1
```

### 时序 2：Telemetry 上报（设备 → 本地 + 云端）

```
ESP32                          本地网关                    云端
  │                              │                        │
  │── PUBLISH devices/esp32-001/telemetry ──→            │
  │   {temp: 25.3, hum: 60.2, ts: 1725789000}            │
  │                              │                        │
  │                              │── 写入本地 SQLite      │
  │                              │── 执行本地规则引擎     │
  │                              │   (if temp>30 → 开风扇) │
  │                              │                        │
  │                              │── 异步同步 ──────────→ │
  │                              │                        │── 写入 D1 device_states
  │                              │                        │── 触发场景规则
  │                              │                        │── 更新 last_seen
```

### 时序 3：App 控制设备（手机 → 设备）

```
手机 App                        本地网关                    ESP32
  │                              │                        │
  │── POST /api/devices/esp32-001/control ──→            │
  │   {command: "set_led", params: {brightness: 80}}     │
  │                              │                        │
  │                              │── 权限校验（本地）     │
  │                              │── PUBLISH devices/esp32-001/command ──→
  │                              │                        │
  │                              │                        │── 执行命令（PWM 调光）
  │                              │                        │
  │                              │←── PUBLISH ack ────────│
  │                              │   {success: true}      │
  │                              │                        │
  │←── 200 OK {success: true} ──│                        │
  │                              │                        │
  │                              │── 异步同步状态 ──────→ 云端
```

### 时序 4：场景联动（传感器触发 → 多设备联动）

```
ESP32-1（温湿度）               本地网关                  ESP32-2（风扇）
  │                              │                        │
  │── PUBLISH telemetry ───────→ │                        │
  │   temp: 32.5                 │                        │
  │                              │                        │
  │                              │── 规则引擎匹配：       │
  │                              │   "高温开风扇"         │
  │                              │                        │
  │                              │── PUBLISH devices/esp32-2/command ──→
  │                              │   {command: "turn_on"} │
  │                              │                        │
  │                              │                        │── 开风扇
  │                              │                        │
  │                              │←── ack ────────────────│
  │                              │                        │
  │                              │── 异步同步 ──────→ 云端（记录场景触发日志）
```

### 时序 5：云端 → 设备（远程 OTA / 远程配置）

```
云端（Cloudflare Worker）        本地网关                  ESP32
  │                              │                        │
  │── 管理员触发 OTA ──────────→ │                        │
  │   POST /admin/devices/esp32-001/ota                   │
  │   {version: "1.2.0", url: "https://r2..."}            │
  │                              │                        │
  │                              │── 保存 OTA 任务到队列  │
  │                              │                        │
  │                              │── PUBLISH devices/esp32-001/ota ──→
  │                              │   {url: "...", version: "1.2.0"}
  │                              │                        │
  │                              │                        │── 下载固件
  │                              │                        │── 校验签名
  │                              │                        │── 写入 OTA 分区
  │                              │                        │── 重启
  │                              │                        │
  │                              │←── PUBLISH status ─────│
  │                              │   {ota: "success"}     │
  │                              │                        │
  │←── 同步完成 ────────────────│                        │
```

### 时序 6：本地网关定期同步到云端

```
本地网关                         云端（Cloudflare）
  │                              │
  │── 每 30 秒：                  │
  │   批量上传 telemetry 缓存 ──→ │
  │   上传场景执行日志 ──────────→ │
  │   上传设备状态变更 ──────────→ │
  │                              │
  │←── 云端下发：                 │
  │   远程 App 的命令队列         │
  │   新 OTA 任务                 │
  │   配置更新                    │
  │                              │
  │── 每 5 分钟：                  │
  │   同步全量设备状态 ──────────→ │
  │←── 云端规则/场景更新 ─────────│
```

### 模式切换决策树

```
设备启动 / 网络恢复
        │
        ▼
  本地网关可达？──是──→ MODE_LOCAL_GATEWAY
        │                - MQTT 通信
        │                - 本地规则引擎
        │                - 异步云同步
        │
        否
        ▼
   云端可达？────是──→ MODE_CLOUD
        │                - HTTP 通信
        │                - 云端规则引擎
        │                - 无本地缓存
        │
        否
        ▼
  SoftAP 模式？──是──→ MODE_SOFTAP
        │                - 手机直连
        │                - 本地 Web API
        │                - 无规则引擎
        │
        否
        ▼
  MODE_OFFLINE
       - 本地规则引擎
       - SPIFFS 数据缓存
       - 每 60s 尝试重连
```

### 手机控制设备的两条路径

#### 路径 A：手机与本地网关同局域网（本地控制）

```
[手机 App] ──WiFi──→ [本地网关:8080] ──MQTT──→ [ESP32]
                      │
                      └── 本地规则引擎（温度→风扇）
```

- 手机直接访问 `http://192.168.1.100:8080/api/devices/...`
- 延迟 < 10ms，无云端依赖
- 断互联网仍可用（只要 WiFi 局域网通）

#### 路径 B：手机与本地网关不同网络（远程控制）

```
[手机 App] ──互联网──→ [Cloudflare Worker] ──→ [本地网关] ──MQTT──→ [ESP32]
                         │                        │
                         └── 用户认证              └── 本地规则引擎
                         └── 命令队列
```

- 手机访问 `https://your-worker.workers.dev/api/devices/...`
- Worker 校验用户权限 → 把命令写入队列
- 本地网关定期从云端拉取命令队列 → 执行
- 延迟：100ms~2s（取决于网络）

#### 路径 C：本地网关不可用时（手机直连设备 SoftAP）

```
[手机 App] ──WiFi──→ [ESP32 SoftAP:80] ──GPIO──→ [继电器/传感器]
                      │
                      └── 本地 Web API（/status / /control / /config）
                      └── 本地 GPIO 控制
                      └── 无法执行跨设备联动（无网关规则引擎）
```

**触发条件**：
- 本地网关断电/故障
- ESP32 检测不到 MQTT Broker → 自动切换 SoftAP 模式
- 手机搜索并连接 `ESP32-IoT` WiFi（密码 `12345678`）
- 手机访问 `http://192.168.4.1/api/...`

**限制**：
- 只能控制当前这一台 ESP32（无法跨设备联动）
- 无历史数据查询（无本地数据库）
- 无场景规则引擎
- 手机无法同时上网（连着 SoftAP 就不能访问互联网）

#### 三条路径对比

| | 路径 A（本地网关） | 路径 B（远程云端） | 路径 C（SoftAP 直连） |
|---|---|---|---|
| 触发条件 | 手机与网关同 WiFi | 手机在任意网络 | 网关不可用 |
| 延迟 | < 10ms | 100ms~2s | < 5ms |
| 依赖 | 仅需局域网 | 需互联网 + 云端 | 仅需设备供电 |
| 鉴权 | 本地用户表 | Cloudflare Worker JWT | 无（或本地密码） |
| 规则引擎 | ✅ 完整 | ✅ 云端转发 | ❌ 无 |
| 跨设备联动 | ✅ | ✅ | ❌ |
| 历史数据 | ✅ 本地 SQLite | ✅ D1 | ❌ |
| 断网可用 | ✅ | ❌ | ✅ |
| 适用场景 | 日常控制 | 外出远程控制 | 网关故障应急 |

### 关键设计原则（在线模式）

1. **本地网关是主控**：所有设备通信先到网关，网关负责本地规则执行 + 云同步
2. **MQTT 发布订阅**：设备 telemetry 用 PUBLISH，命令用 SUBSCRIBE，天然解耦
3. **云同步是异步的**：网关 → 云端不阻塞本地控制链路（本地控制 < 10ms，云同步秒级）
4. **本地规则优先**：断网时本地规则继续工作，网络恢复后同步结果
5. **命令 QoS**：关键命令用 MQTT QoS 1（至少送达一次），配合去重
6. **云端是增强**：远程访问、OTA、数据分析、多家庭管理 —— 非关键路径
7. **手机双路径**：同局域网直连网关（快），不同网络经云端转发（远）
