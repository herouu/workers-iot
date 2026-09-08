# Termux 本地语音助手 — 实施计划

> 目标：在 Android 手机 Termux 上实现全本地语音助手，支持语音识别、本地 LLM 对话、语音输出，控制 MQTT/HTTP 智能家居设备。

---

## 1. 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                    Termux（手机）                          │
│                                                          │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐           │
│  │ 录音触发  │ →  │ ASR      │ →  │ LLM      │           │
│  │ 通知栏按钮 │    │ Whisper  │    │ Qwen2.5  │           │
│  └──────────┘    └──────────┘    └────┬─────┘           │
│                                        │                 │
│                                   ┌────┴─────┐           │
│                                   │ 意图+回复  │           │
│                                   └────┬─────┘           │
│                                        │                 │
│                              ┌─────────┴────────┐        │
│                              ▼                  ▼        │
│                        [MQTT 控制]        [TTS 语音反馈]  │
│                              │                  │        │
└──────────────────────────────┼──────────────────┼────────┘
                               │                  │
                        [智能家居设备]        [扬声器播放]
```

---

## 2. 技术选型

### 2.1 模块选型

| 模块 | 选型 | 理由 |
|---|---|---|
| **ASR** | whisper.cpp `base` 模型 | C++ 实现最快，内存 ~300MB，中文 WER ~5-8% |
| **LLM** | Qwen2.5-1.5B-Instruct-Q4_K_M | 中文优秀，1.1GB 内存，15-25 token/s |
| **TTS** | Piper 中文模型 | 本地神经网络，中文自然，内存 ~50MB |
| **传输** | MQTT (mqtt.js) + HTTP (node-fetch) | 复用现有网关协议 |
| **语言** | TypeScript | 类型安全，mqtt.js 更优 |
| **运行** | Node.js + tsc 编译 | 需先验证 Node 可用 |
| **守护** | termux-services + termux-wake-lock | 防杀后台 |

### 2.2 模型清单

| 文件 | 大小 | 来源 |
|---|---|---|
| `ggml-base.bin` | ~150 MB | whisper.cpp 官方 |
| `Qwen2.5-1.5B-Instruct-Q4_K_M.gguf` | ~1.1 GB | HuggingFace |
| `zh_CN-huayan-medium.onnx` + json | ~60 MB | Piper 官方 |

**总存储：~1.3 GB**

### 2.3 Node.js 依赖

```json
{
  "dependencies": {
    "mqtt": "^5.3.0",
    "js-yaml": "^4.1.0",
    "node-fetch": "^3.3.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "@types/node": "^20.0.0",
    "@types/js-yaml": "^4.0.0"
  }
}
```

---

## 3. 运行环境要求

| 项目 | 要求 |
|---|---|
| 手机 RAM | ≥ 4 GB（推荐 6GB+） |
| 存储 | ≥ 2 GB 空闲 |
| 系统 | Android 7+，Termux 最新版 |
| Node.js | ≥ 18.x（`node -e "console.log('OK')` 验证） |
| 依赖 | Termux:API（TTS/通知）、Termux:Boot（可选自启） |

---

## 4. 项目结构

```
~/voice-agent/
├── src/
│   ├── main.ts          # 主入口：管道调度
│   ├── recorder.ts      # 录音模块（termux-microphone-record）
│   ├── asr.ts           # Whisper 识别封装
│   ├── llm.ts           # llama.cpp 调用封装
│   ├── tts.ts           # Piper TTS 封装
│   ├── intent.ts        # 意图解析（LLM function-calling）
│   ├── router.ts        # MQTT/HTTP 指令分发
│   └── types.ts         # 类型定义
├── dist/                # tsc 编译输出
├── models/              # 模型文件目录
│   ├── whisper/
│   │   └── ggml-base.bin
│   ├── llm/
│   │   └── Qwen2.5-1.5B-Instruct-Q4_K_M.gguf
│   └── tts/
│       ├── zh_CN-huayan-medium.onnx
│       └── zh_CN-huayan-medium.onnx.json
├── devices.yaml         # 设备注册表
├── config.yaml          # 全局配置
├── recordings/          # 临时音频
├── package.json
└── tsconfig.json
```

---

## 5. 配置文件设计

### 5.1 config.yaml

```yaml
# 全局配置
asr:
  model: models/whisper/ggml-base.bin
  language: "zh"
  threads: 4

llm:
  model: models/llm/Qwen2.5-1.5B-Instruct-Q4_K_M.gguf
  threads: 4
  max_tokens: 128
  temperature: 0.7
  context_size: 2048

tts:
  model: models/tts/zh_CN-huayan-medium.onnx
  speaker: 0  # 说话人ID，多说话人模型用

recording:
  duration: 5       # 最大录音秒数
  sample_rate: 16000
  format: "wav"

# LLM 系统提示
system_prompt: |
  你是智能家居语音助手。根据用户指令控制设备。
  只输出JSON：{"device":"设备名","action":"on/off/set","value":数值,"reply":"简短回复"}。
  不要解释，只输出JSON。
```

### 5.2 devices.yaml

```yaml
# 设备注册表
living_room_light:
  protocol: mqtt
  command_topic: "home/living_room/light/set"
  state_topic: "home/living_room/light/state"
  payload_on: '{"state":"ON"}'
  payload_off: '{"state":"OFF"}'
  # 可选：状态查询
  query_topic: "home/living_room/light/get"

bedroom_switch:
  protocol: http
  endpoint: "http://10.196.52.151:8080/api/bedroom_switch"
  method: "POST"
  headers:
    Content-Type: "application/json"
  body_on: '{"action":"on"}'
  body_off: '{"action":"off"}'

# MQTT Broker 配置
mqtt_broker:
  host: "10.196.52.151"
  port: 1883
  username: ""
  password: ""
  keepalive: 60
```

---

## 6. 核心流程

### 6.1 主循环

```
1. 等待触发（通知栏按钮 / 唤醒词）
2. 录音 → rec.wav
3. Whisper 识别 → 文本
4. LLM 理解 → JSON 指令 + 回复文本
5. 指令路由 → MQTT/HTTP 控制设备
6. TTS 合成 → 播放回复
7. 等待下一次触发
```

### 6.2 关键设计：顺序加载

**不并行运行 ASR + LLM + TTS**，同一时刻只驻留一个模型：

```
Whisper 识别完 → 释放 → 加载 LLM → 生成完 → 释放 → TTS 合成
```

峰值内存控制在 **1.5 GB 以内**。

---

## 7. 实施步骤

### 阶段一：环境准备

| 步骤 | 命令/操作 | 验证 |
|---|---|---|
| 安装 Termux + Termux:API | F-Droid 安装 | `termux-info` |
| 安装基础依赖 | `pkg install nodejs-lts git cmake sox termux-api` | `node --version` |
| 验证 Node.js | `node -e "console.log('OK')"` | 输出 OK |
| 申请存储权限 | `termux-setup-storage` | 能访问 /sdcard |
| 初始化项目 | `npm init -y && npm install` | node_modules 生成 |

### 阶段二：编译模型推理引擎

| 步骤 | 说明 |
|---|---|
| 编译 whisper.cpp | `cmake -B build && cmake --build build -j4` |
| 编译 llama.cpp | `cmake -B build && cmake --build build -j4 --target llama-cli` |
| 下载 Whisper base 模型 | `bash ./models/download-ggml-model.sh base` |
| 下载 Qwen2.5-1.5B 模型 | 从 HuggingFace 下载 gguf |
| 安装 Piper TTS | `pkg install piper-tts` + 下载中文模型 |

### 阶段三：模块开发

| 模块 | 文件 | 功能 |
|---|---|---|
| 类型定义 | types.ts | 设备配置、LLM 输出、管道状态接口 |
| 录音 | recorder.ts | 调 termux-microphone-record，支持按钮触发 |
| ASR | asr.ts | 调 whisper.cpp CLI，返回中文文本 |
| LLM | llm.ts | 调 llama.cpp CLI，输入系统提示+用户文本，输出JSON |
| TTS | tts.ts | 调 Piper，文本→wav→播放 |
| 意图 | intent.ts | 解析 LLM 输出的 JSON，校验设备名 |
| 路由 | router.ts | 按 devices.yaml 分发 MQTT/HTTP |
| 主程序 | main.ts | 管道调度，顺序加载模型 |

### 阶段四：集成测试

| 测试项 | 验证方式 |
|---|---|
| 录音→识别 | 说"打开客厅灯"，看识别文本 |
| LLM 理解 | 验证输出合法 JSON |
| 设备控制 | 确认灯实际开关 |
| TTS 反馈 | 确认语音回复播放 |
| 端到端 | 完整流程跑通，延迟 < 6秒 |
| 内存监控 | `free -m` 峰值 < 2GB |

### 阶段五：优化与守护

| 步骤 | 说明 |
|---|---|
| termux-services 注册 | 后台守护，防杀 |
| termux-wake-lock | 防止休眠断连 |
| 通知栏快捷按钮 | 一键录音触发 |
| 日志记录 | 输出到 ~/voice-agent/app.log |

---

## 8. 性能预期

| 环节 | 耗时 |
|---|---|
| 录音 | 用户说了算（3-5秒） |
| Whisper 识别 | ~1 秒 |
| LLM 生成 | ~2 秒 |
| TTS 合成 | ~0.5 秒 |
| 设备控制 | <0.5 秒 |
| **端到端** | **~5-7 秒** |

---

## 9. 风险与缓解

| 风险 | 影响 | 缓解 |
|---|---|---|
| 手机内存不足 | OOM 杀进程 | 顺序加载，不并行；用 1.5B 小模型 |
| 后台被杀 | 服务不可用 | termux-services + wake-lock |
| Whisper 中文识别错 | 控制错误设备 | 设备名模糊匹配 + 确认回复 |
| LLM 输出非法 JSON | 解析失败 | 正则提取 + 默认回复兜底 |
| 录音质量差 | 识别率降 | 降噪 + 16kHz 采样 + 近场录音 |

---

## 10. 后续演进

```
v1.0: 基础管道（录音→ASR→LLM→控制→TTS）
  ↓
v1.1: 连续监听 + VAD 端点检测（去掉按钮）
  ↓
v1.2: 多轮对话（上下文记忆）
  ↓
v1.3: 唤醒词（"你好小智"）
  ↓
v2.0: 多设备协同 + 场景模式（"回家模式"开灯+开空调）
```

---

## 11. 唤醒词检测方案

### 11.1 结论速览

| 需求 | 结论 |
|---|---|
| 英文唤醒词 Termux 跑通 | ✅ 已有人实证（OpenWakeWord + pulseaudio 流） |
| 中文唤醒词 Termux | ⚠️ 无开箱方案，需自训或走原生 |
| Porcupine | ✅ 支持中文，但 Termux 装不了（无 Android wheel） |
| "OK Google" 当触发源 | ❌ 系统特权，第三方拿不到 |

### 11.2 开源引擎横评

| 引擎 | 中文 | Termux 兼容 | 状态 | 备注 |
|---|---|---|---|---|
| **OpenWakeWord** | ❌ 仅英文 | ✅ 有实证脚本 | 活跃 | tflite 后端，RPi3 单核实时 15-20 模型 |
| **Porcupine** | ✅ 普通话 | ❌ 装不了 | 商业免费档 | 需 AccessKey，Android 原生 SDK 可用 |
| **MicroWakeWord** | ❌ 仅英文 | ⚠️ 理论可行 | HA Android 内置 | INT8 TFLite Micro，30ms 流式推理 |
| **sherpa-onnx KWS** | ✅ 中文 | ⚠️ 需验证 | 新兴 | 流式 zipformer + hotword 打分 |
| **Snowboy** | 有 fork | ⚠️ 编译麻烦 | 已死 | seasalt-ai fork 支持离线自训 |
| **Raven** | — | — | 已归档 | rhasspy2 历史方案 |

### 11.3 已跑通的英文方案（Termux 实证）

`T-vK/wyoming-satellite-termux` — 完整脚本：

```sh
pkg install sox termux-api pulseaudio python-tflite-runtime
pactl load-module module-sles-source      # pulseaudio 录音源
rec -r 16000 -c 1 -b 16 -                 # sox 连续 PCM 流
# → 喂 OpenWakeWord 检测 "ok nabu" / "hey jarvis"
```

### 11.4 中文唤醒词路径

| 路线 | 说明 | 难度 |
|---|---|---|
| **A: Porcupine 原生 App** | 薄 Android App 做唤醒 → MQTT/HTTP 通知 Termux | 中 |
| **B: sherpa-onnx** | Termux 里跑，中文 hotword 打分 | 中 |
| **C: 自训 MicroWakeWord** | Piper 中文音色合成训练数据 | 高 |
| **D: 自训 OpenWakeWord** | 作者说非英语路线图未定 | 高 |

### 11.5 创意触发方案（绕过唤醒词）

| 方案 | 实现 | 推荐度 |
|---|---|---|
| **通知栏按钮** | Termux 发通知，点按录音 | ⭐⭐⭐⭐⭐ 最稳 |
| **Tasker + 传感器** | 翻面/双击/按钮触发 | ⭐⭐⭐⭐ |
| **蓝牙/Wearable 按钮** | BLE → Tasker → Termux | ⭐⭐⭐ |
| **连续 VAD 监听** | 有声段才识别，省资源 | ⭐⭐⭐⭐ |
| **"OK Google" 旁路** | ❌ 系统特权，不可行 | — |

### 11.6 推荐演进路线

```
v1: 通知栏按钮触发（零依赖，快速出活）
  ↓
v2: VAD + OpenWakeWord 连续监听（英文唤醒，当前方案）
  ↓
v3: 自研固件做低功耗唤醒层 + Termux 做执行层（后续规划）
```

> **决策**：暂不引入第三方固件（ESP32 等），当前使用 VAD + OpenWakeWord 方案。后续有能力时自研固件做低功耗唤醒层。

### 11.7 后台保活三件套

```sh
termux-wake-lock                    # 持唤醒锁
# Termux:Boot 插件 + ~/.termux/boot/ 自启脚本
# 系统设置 → 电池 → Termux → 不优化
```

### 11.8 关键依赖（Termux 包）

| 包 | 用途 |
|---|---|
| `pulseaudio` | 连续音频流（module-sles-source） |
| `sox` | 格式转换 + 流式录音 |
| `python-tflite-runtime` | OpenWakeWord 推理后端 |
| `termux-api` | 通知栏/录音/权限 |

---

## 12. 参考资料

- whisper.cpp: https://github.com/ggerganov/whisper.cpp
- llama.cpp: https://github.com/ggerganov/llama.cpp
- Piper TTS: https://github.com/rhasspy/piper
- Qwen2.5: https://github.com/QwenLM/Qwen2.5
- 小智 ESP32: https://github.com/78/xiaozhi-esp32
- Termux 文档: https://wiki.termux.com

---

*文档版本：v1.1 | 创建日期：2026-09-08 | 更新：合并唤醒词调研*
