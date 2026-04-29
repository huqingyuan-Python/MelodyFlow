#!/bin/bash
#
# MelodyFlow Music - 一键部署脚本 (macOS)
# 使用方法: ./start-server-macos.sh
#

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER_DIR="$SCRIPT_DIR/music-server"

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}   MelodyFlow Music 部署脚本${NC}"
echo -e "${CYAN}   适用平台: macOS${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# ===== 1. 检测 Node.js =====
echo -e "[1/5] ${YELLOW}检测 Node.js ...${NC}"
if ! command -v node &> /dev/null; then
    echo ""
    echo -e "${RED}[错误] 未检测到 Node.js${NC}"
    echo ""
    echo "请先安装 Node.js:"
    echo "  https://nodejs.org/zh-cn/"
    echo ""
    echo "推荐使用 Homebrew 安装:"
    echo "  brew install node"
    echo ""
    exit 1
fi

NODE_EXE=$(command -v node)
NODE_VER=$(node --version)
echo -e "  已找到: ${GREEN}$NODE_EXE${NC} $NODE_VER"

# ===== 2. 检查 / 安装依赖 =====
echo ""
echo -e "[2/5] ${YELLOW}检查依赖 ...${NC}"

cd "$SERVER_DIR"

if [ ! -d "node_modules" ]; then
    echo "  首次运行，正在安装依赖（使用国内镜像）..."
    npm install --registry=https://registry.npmmirror.com || \
    npm install --registry=https://registry.npmmirror.com --legacy-peer-deps
else
    echo -e "  依赖已就绪"
fi

# ===== 3. 获取本机局域网 IP =====
echo ""
echo -e "[3/5] ${YELLOW}检测局域网 IP ...${NC}"

# macOS: 使用 networksetup 或 ifconfig
if command -v networksetup &> /dev/null; then
    # 尝试获取 en0（以太网）或 en1（Wi-Fi）的 IP
    LAN_IP=$(networksetup -getinfo "Wi-Fi" 2>/dev/null | grep "Router:" | awk '{print $2}')
fi

# 备用方案: ifconfig
if [ -z "$LAN_IP" ] || [ "$LAN_IP" = "" ]; then
    LAN_IP=$(ifconfig | grep 'inet ' | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
fi

if [ -z "$LAN_IP" ]; then
    LAN_IP="127.0.0.1"
fi

echo -e "  局域网 IP: ${GREEN}$LAN_IP${NC}"

# ===== 4. 启动服务 =====
echo ""
echo -e "[4/5] ${YELLOW}启动 MelodyFlow 音源服务 ...${NC}"
echo ""
echo -e "${CYAN}================================================${NC}"
echo -e "   服务地址 (本机): ${GREEN}http://127.0.0.1:3000${NC}"
echo -e "   服务地址 (局域网): ${GREEN}http://$LAN_IP:3000${NC}"
echo ""
echo -e "   前端: 直接在浏览器打开 ${GREEN}index.html${NC}"
echo -e "   局域网访问: http://$LAN_IP/项目路径/index.html"
echo ""
echo -e "   首次使用: 在播放器设置中填写 API 地址:"
echo -e "   API 地址: ${GREEN}http://127.0.0.1:3000${NC}"
echo -e "${CYAN}================================================${NC}"
echo ""
echo -e "按 ${RED}Ctrl+C${NC} 停止服务"
echo ""

# 延迟启动浏览器 (macOS)
sleep 1
open "http://127.0.0.1:3000/health" 2>/dev/null || true

# 启动服务
node server.js
