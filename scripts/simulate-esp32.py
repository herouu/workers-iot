#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ESP32 设备模拟器 —— 对接 cloudiot-local-gateway 本地网关（P2 通道）

模拟 ESP32 固件的 MQTT 接入行为，用于开发/测试移动端 P2 本地通道。
与真实固件对齐（见 doc/esp32-onboarding.md 与 cloudiot-local-gateway/src/server/mqtt.ts）：

  - client id           = device_id（网关用 client.id 作为设备标识）
  - password            = device secret（明文；网关侧 SHA256(secret+salt) 校验）
  - 设备不存在时        网关自动注册（autoRegister，DEVICE_AUTO_REGISTER 默认开）
  - 遥测上报主题        devices/{deviceId}/telemetry
  - 命令订阅主题        devices/{deviceId}/command
  - 命令回执（ACK）     devices/{deviceId}/ack
  - 在线状态            devices/{deviceId}/status

依赖：paho-mqtt（pip install paho-mqtt）

用法示例：
  # 连本地网关，模拟遥测机（30s 间隔）
  python scripts/simulate-esp32.py --host 192.168.1.100 --device-id esp32-sim-001 --secret dev-secret-123

  # 收到命令后自动回 ACK + 打印
  python scripts/simulate-esp32.py --secret dev-secret-123 --interval 15 --run-seconds 120
"""

import argparse
import json
import logging
import random
import sys
import time
from datetime import datetime

try:
    import paho.mqtt.client as mqtt
except ImportError:
    sys.stderr.write("缺少依赖 paho-mqtt，请先安装: pip install paho-mqtt\n")
    sys.exit(2)

LOG = logging.getLogger("esp32-sim")


def _now_iso() -> str:
    return datetime.now().isoformat()


# ============ 模拟传感器 ============
def read_telemetry(device_id: str) -> dict:
    """生成模拟遥测数据（温湿度 + 附加设备状态）"""
    return {
        "temperature": round(random.uniform(20.0, 32.0), 1),
        "humidity": round(random.uniform(35.0, 75.0), 1),
        "battery": round(random.uniform(75.0, 100.0), 1),
        "rssi": random.randint(-85, -40),
        "uptime_sec": int(time.time()),
    }


# ============ 命令执行（模拟 ESP32 实际行为） ============
def execute_command(cmd_id: str, command: str, params: dict) -> dict:
    """执行命令并返回执行结果（真实固件会操作 GPIO/外设）"""
    LOG.info("[exec] 命令 %s=%s params=%s", cmd_id, command, json.dumps(params, ensure_ascii=False))
    result = {"success": True, "result": None}

    if command == "set_led":
        brightness = int(params.get("brightness", 0))
        LOG.info("[exec] LED 亮度 -> %s%%", brightness)
        result["result"] = {"brightness": brightness}
    elif command == "get_status":
        result["result"] = read_telemetry("")
    elif command == "reboot":
        LOG.info("[exec] 模拟重启")
        result["result"] = {"rebooting": True}
    elif command == "set_interval":
        result["result"] = {"interval": params.get("interval", 30)}
    else:
        result["success"] = False
        result["result"] = {"error": f"未知命令: {command}"}

    return result


def run_sim(args) -> int:
    device_id = args.device_id
    host = args.host
    port = args.port
    secret = args.secret or f"sim-secret-{device_id}"

    # client id 必须是设备 id（网关以此鉴权）
    client = mqtt.Client(
        client_id=device_id,
        protocol=mqtt.MQTTv311,
        callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
    )
    client.username_pw_set(username=None, password=secret)

    connected = {"ok": False}
    last_telemetry = 0.0
    cmd_topics = [f"devices/{device_id}/command"]

    def on_connect(client_, userdata, flags, reason_code, properties=None):
        if reason_code == 0:
            connected["ok"] = True
            LOG.info("[%s] MQTT 已连接 %s:%s", device_id, host, port)
            for t in cmd_topics:
                client_.subscribe(t, qos=0)
                LOG.info("[%s] 已订阅 %s", device_id, t)
            # 上报在线
            client_.publish(f"devices/{device_id}/status",
                            json.dumps({"online": True, "ts": _now_iso()}), qos=0)
        else:
            LOG.error("[%s] 连接失败 reason_code=%s", device_id, reason_code)

    def on_message(client_, userdata, msg):
        topic = msg.topic
        try:
            payload = json.loads(msg.payload.decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            LOG.error("[%s] 命令 payload 非 JSON: %r", device_id, msg.payload[:120])
            return

        cmd_id = payload.get("id")
        command = payload.get("command")
        params = payload.get("params") or {}
        LOG.info("[%s] 收到命令 id=%s command=%s", device_id, cmd_id, command)

        result = execute_command(cmd_id, command, params)
        # 回 ACK
        ack = {
            "command_id": cmd_id,
            "success": result["success"],
            "result": result["result"],
            "ts": _now_iso(),
        }
        client_.publish(f"devices/{device_id}/ack", json.dumps(ack), qos=0)
        LOG.info("[%s] 已 ACK %s success=%s", device_id, cmd_id, result["success"])

    client.on_connect = on_connect
    client.on_message = on_message

    try:
        client.connect(host, port, keepalive=30)
        client.loop_start()

        # 等连接
        deadline_conn = time.time() + 10
        while not connected["ok"] and time.time() < deadline_conn:
            time.sleep(0.2)
        if not connected["ok"]:
            LOG.error("[%s] 无法连接网关 %s:%s", device_id, host, port)
            return 2

        # 主循环
        start = time.time()
        while True:
            now = time.time()
            if args.run_seconds and now - start >= args.run_seconds:
                LOG.info("[%s] 运行 %ss 结束", device_id, args.run_seconds)
                break
            if now - last_telemetry >= args.interval:
                last_telemetry = now
                data = read_telemetry(device_id)
                # 网关期待 devices/{id}/telemetry 带 data 字段
                client.publish(f"devices/{device_id}/telemetry",
                               json.dumps({"data": data, "ts": _now_iso()}), qos=0)
                LOG.info("[%s] 上报遥测 %s", device_id, json.dumps(data, ensure_ascii=False))
            time.sleep(0.5)
    except KeyboardInterrupt:
        pass
    except Exception as exc:
        LOG.error("[%s] 运行异常: %s", device_id, exc)
        return 1
    finally:
        # 下线
        try:
            client.publish(f"devices/{device_id}/status",
                           json.dumps({"online": False}), qos=0)
            client.loop_stop()
            client.disconnect()
        except Exception:
            pass

    return 0


def create_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="ESP32 设备模拟器（对接本地网关 MQTT）")
    p.add_argument("--host", default="127.0.0.1", help="网关地址")
    p.add_argument("--port", type=int, default=1883, help="网关 MQTT 端口")
    p.add_argument("--device-id", default="esp32-sim-001", help="设备 ID（= MQTT client id）")
    p.add_argument("--secret", default=None, help="设备密钥（缺省自动生成 sim-secret-<device>）")
    p.add_argument("--interval", type=int, default=30, help="遥测上报间隔（秒）")
    p.add_argument("--run-seconds", type=int, default=0, help="运行秒数（0=持续运行）")
    return p


def main(argv=None) -> int:
    parser = create_parser()
    args = parser.parse_args(argv)
    logging.basicConfig(
        level=logging.DEBUG,
        format="%(asctime)s %(levelname)-7s %(message)s",
        datefmt="%H:%M:%S",
    )
    return run_sim(args)


if __name__ == "__main__":
    sys.exit(main())
