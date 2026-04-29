#!/bin/bash
#
# MelodyFlow Music - 一键部署脚本 (Linux)
# 使用方法: ./start-server-linux.sh
#

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER_DIR="$SCRIPT_DIR/music-server"

# 颜色 (检测终端是否支持)
if [ -t 1 ]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    CYAN='\033[0;36m'
    NC='\033[0m'
else
    RED=''
    GREEN=''
    YELLOW=''
    CYAN=''
    NC=''
fi

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}   MelodyFlow Music 部署脚本${NC}"
echo -e "${CYAN}   适用平台: Linux${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# ===== 1. 检测 Node.js =====
echo -e "[1/5] ${YELLOW}检测 Node.js ...${NC}"
if ! command -v node &> /dev/null; then
    echo ""
    echo -e "${RED}[错误] 未检测到 Node.js${NC}"
    echo ""
    echo "请先安装 Node.js:"
    echo "  Ubuntu/Debian: sudo apt install nodejs npm"
    echo "  Fedora/RHEL:    sudo dnf install nodejs"
    echo "  Arch:           sudo pacman -S nodejs npm"
    echo ""
    echo "或使用 NodeSource 安装最新版本:"
    echo "  curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -"
    echo "  sudo apt-get install -y nodejs"
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

# Linux: 使用 ip 或 hostname
if command -v ip &> /dev/null; then
    LAN_IP=$(ip addr show | grep 'inet ' | grep -v '127.0.0.1' | awk '{print $2}' | cut -d'/' -f1 | head -1)
elif command -v hostname &> /dev/null; then
    LAN_IP=$(hostname -I | awk '{print $1}')
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

# 尝试打开浏览器 (Linux)
if command -v xdg-open &> /dev/null; then
    xdg-open "http://127.0.0.1:3000/health" 2>/dev/null &
elif command -v gnome-open &> /dev/null; then
    gnome-open "http://127.0.0.1:3000/health" 2>/dev/null &
fi

# 启动服务
node server.js
