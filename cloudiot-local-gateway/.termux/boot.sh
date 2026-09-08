#!/data/data/com.termux/files/usr/bin/sh
# Termux 开机自启脚本
# 放置于 ~/.termux/boot/gateway.sh

# 保持 WiFi 唤醒
termux-wifi-lock

# 进入网关目录
cd ~/cloudiot-local-gateway

# 启动 PM2 网关
pm2 start ecosystem.config.cjs
pm2 save
