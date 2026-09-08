# IoT 设备接入流程 — 现状与修复指南

> 生成时间：2026-09-08  
> 适用项目：cloudiot-backend (Workers) + cloudiot-mobile (Vue/Vite)

---

## 一、当前设备接入通道

| 通道 | 状态 | 问题 |
|---|---|---|
| HTTP 上报 `POST /realtime/telemetry` | ⚠️ 半可用 | 无鉴权、无数据校验、在线态只置 1 不归零 |
| HTTP 轮询 `GET /realtime/commands/:deviceId` | ⚠️ 唯一闭环 | SELECT→UPDATE 非原子，并发重复投递 |
| WebSocket (DeviceSession) | ❌ 断 | `/ws` 路由未挂载，永远连不上 |
| WebSocket (RealtimeHub) | ❌ 断 | 单实例 + `atob(token)` 伪认证 + 跨用户数据互通 |
| MQTT | ❌ 无 | 仅注释占位 |

**真实可用 = HTTP 上报 + 轮询取命令**，且无认证、无原子性。

---

## 二、前端"添加设备"入口现状

| 问题 | 位置 |
|---|---|
| 按钮指向 `/devices/add` 但路由不存在 | `DevicesPage.vue:72,84` → 死链 |
| `provisionDevice` 字段错 | 前端发 `serialNumber`，后端要 `mac_address` |
| 设备列表纯 mock | `DevicesPage.vue:144-151` 硬编码 6 台假设备 |
| 设备详情字段全错位 | `DeviceDetailPage.vue` 绑 `status/location/lastUpdate`，后端返回 `online/state/config/room` |
| 历史查询参数错 | 前端发 `period=24h/7d/30d`，后端只认 `start/end/limit` |

**结论：从 UI 到后端没有一段是通的。**

---

## 三、Provisioning（配网注册）现状

### 后端 `POST /api/v1/devices/provision`（`deviceHandler.ts:299-345`）

```
body: { mac_address, name?, type? }
流程：
  1. 按 mac_address 查 devices
  2. 已存在且 owner 非本人 → 409
  3. 已存在且是本人 → 200 { device, isNew:false }
  4. 不存在 → 生成 dev_id 插入，online=1
```

### 缺陷
- 无所有权证明：知道别人 MAC 即可抢注
- 无配网阶段：设备如何获取云端地址/凭证？无 AP 配网、蓝牙、声波
- 无出厂预置体系：无 device_secret 发放/存储
- 竞态：check-then-insert 非事务
- 前后端字段不一致：前端发 `serialNumber`，后端要 `mac_address`

---

## 四、完整设备接入方案

### 架构图

```
[厂商出厂]            [设备端]                  [Cloudflare Worker]            [App 端]
烧录 device_id+secret → WiFi → HTTPS/WSS      ┌─ 鉴权 API ─┐           扫码/手动输入 claim_code
                      telemetry ───────────→  │  D1 状态   │  ←─────── claim 绑定
                     轮询/WS 取命令 ←────────  │  KV claim  │  ───────→ 控制/订阅
                                              └────────────┘
```

### 5 步落地

#### 1. 出厂预置（表结构变更）

`devices` 表新增列：
```sql
ALTER TABLE devices ADD COLUMN secret_hash TEXT;
ALTER TABLE devices ADD COLUMN product_id TEXT;
ALTER TABLE devices ADD COLUMN claim_code TEXT;
ALTER TABLE devices ADD COLUMN claimed_at INTEGER;
```

新增 `provision_claims` 表（或用 KV `claim:<code>` → `{deviceId, ttl}`）。

设备固件烧录：`device_id + secret`（云端存 `secret_hash`，SHA-256 带随机盐）。

#### 2. Claim 绑定（替换原 provision）

```
POST /api/v1/devices/claim
  Auth: 用户 Bearer JWT（接回 withAuth 中间件）
  body: { claim_code, name?, room? }
流程：
  1. 查 KV claim:<code>，不存在/过期 → 404
  2. 原子 delete（防抢注/防复用）
  3. 设备已有 owner 且非本人 → 409
  4. 事务内 UPDATE devices SET user_id=?, claimed_at=?, name/room
  5. 返回 { device }
```

#### 3. 设备鉴权（新增中间件）

```
设备每次请求带: Authorization: Bearer <device-jwt>
  下发时机：设备首次上线用 secret 换短时 JWT（HS256，key=secret_hash）
新增 withDeviceAuth 中间件（类 withAuth，按 device 维度签发）
保护: /realtime/telemetry、/realtime/commands/*、/ws
```

#### 4. 数据通道（WS 为主 + HTTP 兜底）

**通道 A：长连接（主）**

```
设备 → Worker /device/ws（DurableObject 按 device_id 分实例）
  1. 鉴权通过后 accept
  2. 收 telemetry → 校验字段 → D1 落库（批量/节流）→ 更新 last_seen
  3. 有命令 → 直接 push；设备回 ACK {commandId, success, state}
  4. 心跳 30s，断线靠 DO alarm 判定 offline
```

**通道 B：HTTP 轮询（兜底）**

```
POST /realtime/telemetry  → 加 device auth + 字段 schema + last_seen 更新
GET  /realtime/commands/:deviceId?since=  → 原子领取:
   UPDATE device_commands SET status='sent' WHERE device_id=? AND status='pending'
   AND id IN (SELECT ... LIMIT n) RETURNING *
POST /realtime/commands/:deviceId/ack  → 回执
```

**在线判定修正**：超时 90s 无心跳 → 置 offline、写 last_seen。

#### 5. 前端补齐

1. 路由加 `/devices/add` → `AddDevicePage.vue`（方式选择：扫码 / 手动输入 code）
2. `AddDevicePage` 输入 claim code → 调 claim 接口
3. DevicesPage 真实化：去掉 mock，`getDevices()` + 字段映射（online:boolean、state、room）
4. DeviceDetailPage：字段对齐 + 历史改 `start/end/limit` 时间戳 + 真渲染图表
5. 统一类型：以 API 契约为准建 `types` 一份，删三套分裂模型

---

## 五、关键文件定位

### 后端改动点

| 文件 | 改动 |
|---|---|
| `src/handlers/deviceHandler.ts:299-345` | provision → claim 重写 |
| `src/routes/realtime.ts:21-118` | telemetry/commands 加鉴权 + 原子领取 |
| `src/durableObjects/DeviceSession.ts` | 真正挂载 `/device/ws` 路由 |
| `src/durableObjects/RealtimeHub.ts` | 按 userId 分实例或废弃 |
| `src/middleware/auth.ts` | 接线到全局 |
| `migrations/001_initial_schema.sql` | 新增 secret_hash/claim_code 字段 |
| `src/utils/password.ts` | 密码哈希换 PBKDF2+随机盐 |

### 前端改动点

| 文件 | 改动 |
|---|---|
| `src/router/index.ts` | 加 `/devices/add` 路由 |
| `src/pages/AddDevicePage.vue` | 新建：方式选择 + claim 输入 |
| `src/pages/DevicesPage.vue:144-151` | 去掉 mock，接 getDevices() |
| `src/pages/DeviceDetailPage.vue` | 字段对齐 + 历史参数修正 |
| `src/api/device.ts:53-58` | provision → claim，字段改 claim_code |
| `src/api/device.ts:61` | history 改 start/end/limit 时间戳 |
| `src/types/index.ts` | 统一为后端 API 契约 |

---

## 六、建议落地顺序

```
Phase 1（安全地基）:
  backend: withAuth 接线 → claim 流程 + 表结构 → device auth → 密码哈希换 PBKDF2

Phase 2（设备通道）:
  backend: DeviceSession 挂路由 → 原子取命令 → 心跳/离线判定
  frontend: /devices/add 路由 → AddDevicePage → provision 对接

Phase 3（数据闭环）:
  frontend: DevicesPage 真实化 → 详情页字段/历史修正 → 类型统一
  backend: telemetry 批量落库 → 命令 ACK 状态机

Phase 4（进阶，按产品规划）:
  OTA 升级 → 设备影子(desired/reported) → 规则引擎 → MQTT 桥接
```

---

## 七、已知关联问题

- 认证中间件 `withAuth` 全项目未接线（`middleware/auth.ts` 死代码）
- 密码 SHA-256 + 写死盐 `'cloudiot-salt-2024'`（高危）
- forgot-password 响应直接返回 debug.token（高危）
- CORS `*` + Credentials 同用（非法组合）
- 全站单实例 RealtimeHub + 默认订阅 `*`（跨用户泄露）
- 两套 OpenAPI spec 互相漂移（index.ts 手写 + schemas/zod-openapi）
- zod 依赖装了但零运行时校验
- 零测试、零 lint、零 CI
