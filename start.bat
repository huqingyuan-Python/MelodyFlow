@echo off
chcp 65001 >nul
title MelodyFlow 一键启动

echo ============================================
echo        MelodyFlow 音乐服务器 · 一键启动
echo ============================================
echo.

:: 跳到脚本所在目录
cd /d "%~dp0"

:: 检测 Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js！
    echo 请先安装：https://nodejs.org/ （推荐 LTS 版本）
    pause
    exit /b 1
)

for /f "delims=" %%v in ('node --version') do set NODE_VER=%%v
echo [OK] Node.js %NODE_VER%
echo.

:: ---- 音乐服务 (端口 3000) ----
netstat -ano | findstr ":3000 " | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    echo [跳过] 音乐服务 (3000) 已在运行
) else (
    echo [启动] 音乐服务 (端口 3000) ...
    start "MelodyFlow-音乐" cmd /k "title MelodyFlow-音乐 && cd /d "%~dp0music-server" && node server.js"
    timeout /t 2 /nobreak >nul
)

:: ---- 用户服务 (端口 3001) ----
netstat -ano | findstr ":3001 " | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    echo [跳过] 用户服务 (3001) 已在运行
) else (
    echo [启动] 用户服务 (端口 3001) ...
    start "MelodyFlow-用户" cmd /k "title MelodyFlow-用户 && cd /d "%~dp0user-server" && node server.js"
    timeout /t 2 /nobreak >nul
)

:: 获取本机局域网 IP（优先 192.168 网段）
set LOCAL_IP=
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr "IPv4" ^| findstr "192.168"') do (
    if not defined LOCAL_IP set LOCAL_IP=%%a
)
set LOCAL_IP=%LOCAL_IP:~1%

:: 确认服务都起来了
timeout /t 2 /nobreak >nul

netstat -ano | findstr ":3000 " | findstr "LISTENING" >nul
set MUSIC_OK=%errorlevel%

netstat -ano | findstr ":3001 " | findstr "LISTENING" >nul
set USER_OK=%errorlevel%

echo.
echo ============================================
if %MUSIC_OK% equ 0 (
    echo [OK] 音乐服务  : http://127.0.0.1:3000
) else (
    echo [失败] 音乐服务启动失败，请检查端口占用
)
if %USER_OK% equ 0 (
    echo [OK] 用户服务  : http://127.0.0.1:3001
) else (
    echo [失败] 用户服务启动失败，请检查端口占用
)
echo ============================================
echo.
echo 请用浏览器打开：
if defined LOCAL_IP (
    echo   本机：     http://127.0.0.1:3000
    echo   局域网：   http://%LOCAL_IP%:3000
) else (
    echo   http://127.0.0.1:3000
)
echo.
echo 关闭此窗口将停止所有服务。
echo.
start http://127.0.0.1:3000
pause
