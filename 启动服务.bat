@echo off
chcp 65001 >nul 2>&1
setlocal EnableDelayedExpansion

:: ============================================
::    MelodyFlow Music - 一键部署脚本 (Windows)
:: ============================================

set "SCRIPT_DIR=%~dp0"
set "SERVER_DIR=%SCRIPT_DIR%music-server"
set "NODE_VER=0"

title MelodyFlow Music - 部署脚本

echo.
echo  ========================================
echo    MelodyFlow Music 部署脚本
echo    适用平台: Windows
echo  ========================================
echo.

:: ===== 1. 检测 / 安装 Node.js =====
echo [1/5] 检测 Node.js ...

set "NODE_EXE="
if exist "C:\Program Files\nodejs\node.exe" (
    set "NODE_EXE=C:\Program Files\nodejs\node.exe"
) else if exist "C:\Program Files (x86)\nodejs\node.exe" (
    set "NODE_EXE=C:\Program Files (x86)\nodejs\node.exe"
) else (
    for %%i in (node) do set "NODE_FOUND=%%~$PATH:i"
    if not "!NODE_FOUND!"=="" set "NODE_EXE=!NODE_FOUND!"
)

if "!NODE_EXE!"=="" (
    echo.
    echo  [未检测到 Node.js，准备下载安装...]
    echo.
    echo  正在打开 Node.js 下载页面...
    echo  请下载 LTS 版本，下载完成后运行本脚本即可
    echo.
    echo  下载地址: https://nodejs.org/zh-cn/
    echo.
    echo  如果下载太慢，请使用国内镜像:
    echo    https://npmmirror.com/mirrors/node/
    echo.
    echo  也可使用国内加速版（来自 npmmirror）:
    echo    https://cdn.npmmirror.com/binaries/node/
    echo.
    echo  安装完成后重新运行本脚本
    echo.
    pause
    exit /b 1
)

for /f "delims=" %%v in ('!NODE_EXE! --version 2^>nul') do set "NODE_VER=%%v"
echo   已安装: !NODE_EXE!  !NODE_VER!

:: ===== 2. 检查 npm 版本 =====
echo [2/5] 检查 npm ...
for /f "delims=" %%n in ('!NODE_EXE! -v 2^>nul') do set "NPM_VER=%%n"
echo   npm: !NPM_VER!

:: ===== 3. 安装依赖（国内镜像）====
echo.
echo [3/5] 安装依赖（使用 npmmirror 国内镜像）...

cd /d "!SERVER_DIR!"

if not exist "node_modules" (
    echo   首次运行，正在安装...
    "!NODE_EXE!" npm install --registry=https://registry.npmmirror.com
    if errorlevel 1 (
        echo   [警告] npmmirror 安装失败，尝试阿里镜像...
        "!NODE_EXE!" npm install --registry=https://registry.npmmirror.com
        if errorlevel 1 (
            echo   [警告] 阿里镜像也失败了，尝试腾讯镜像...
            "!NODE_EXE!" npm install --registry=https://mirrors.cloud.tencent.com/npm/
        )
    )
) else (
    echo   依赖已就绪，跳过
)

:: ===== 4. 获取局域网 IP =====
echo.
echo [4/5] 检测局域网 IP ...
set "LAN_IP="
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4" ^| findstr /v "127.0.0.1"') do (
    for %%b in (%%a) do (
        if not "%%b"=="" (
            if "!LAN_IP!"=="" set "LAN_IP=%%b"
        )
    )
)
set "LAN_IP=!LAN_IP: =!"
if "!LAN_IP!"=="" set "LAN_IP=127.0.0.1"
echo   局域网 IP: !LAN_IP!

:: ===== 5. 启动服务 =====
echo.
echo [5/5] 启动 MelodyFlow 音源服务 ...
echo.
echo  ================================================
echo   服务地址 (本机): http://127.0.0.1:3000
echo   服务地址 (局域网): http://!LAN_IP!:3000
echo.
echo   前端使用: 直接打开项目目录中的 index.html
echo   局域网访问: http://!LAN_IP!/index.html
echo.
echo   首次使用请在播放器设置中填写 API 地址:
echo   API 地址: http://127.0.0.1:3000
echo.
echo   按 Ctrl+C 停止服务
echo  ================================================
echo.
echo  正在启动服务...
echo.

:: 延迟打开浏览器（给服务一点启动时间）
start "" "http://127.0.0.1:3000/health"

:: 启动服务
"!NODE_EXE!" server.js
