@echo off
chcp 65001 >nul
title MelodyFlow 一键启动

echo ============================================
echo       MelodyFlow 音乐服务器 · 一键启动
echo ============================================
echo.

:: 检测 Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js！
    echo 请先安装 Node.js：https://nodejs.org/
    echo 推荐安装 LTS 版本。
    pause
    exit /b 1
)

for /f "delims=" %%v in ('node --version') do set NODE_VER=%%v
echo [OK] Node.js %NODE_VER%

:: 检查端口占用
netstat -ano | findstr ":3000 " | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    echo [警告] 端口 3000 已被占用，可能已有实例在运行
    echo 是否继续启动？（按任意键继续，关闭此窗口取消）
    pause >nul
)

:: 启动 music-server
echo.
echo [1/2] 正在启动音乐服务 (端口 3000)...
start "MelodyFlow-Music" cmd /k "cd /d "%~dp0music-server" && node server.js"

:: 等待 music-server 启动
timeout /t 2 /nobreak >nul

:: 启动 user-server
echo [2/2] 正在启动用户服务 (端口 3001)...
start "MelodyFlow-User" cmd /k "cd /d "%~dp0user-server" && node server.js"

:: 等待服务启动
timeout /t 3 /nobreak >nul

:: 获取本机 IP
set LOCAL_IP=
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr "IPv4" ^| findstr "192.168"') do (
    if not defined LOCAL_IP set LOCAL_IP=%%a
)
set LOCAL_IP=%LOCAL_IP:~1%

:: 打开浏览器
echo.
echo [完成] 服务已启动！
echo.
echo  请用以下地址访问：
echo  ┌────────────────────────────────────────┐
echo  │  本机访问：  http://127.0.0.1:3000     │
if defined LOCAL_IP (
    echo  │  局域网访问：http://%LOCAL_IP%:3000  │
)
echo  └────────────────────────────────────────┘
echo.
echo  关闭此窗口会停止服务。
echo  按任意键打开浏览器...
pause >nul
start http://127.0.0.1:3000
