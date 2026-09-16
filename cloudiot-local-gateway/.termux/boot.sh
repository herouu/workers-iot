#!/data/data/com.termux/files/usr/bin/sh
# Termux 开机自启脚本
# 放置于 ~/.termux/boot/gateway.sh

# 保持 WiFi 唤醒
termux-wifi-lock

# 进入网关目录
cd ~/cloudiot-local-gateway

# 幂等启动：已运行则重启，否则首次启动
if pm2 describe gateway >/dev/null 2>&1; then
  pm2 restart gateway
else
  pm2 start ecosystem.config.cjs
fi
pm2 save
