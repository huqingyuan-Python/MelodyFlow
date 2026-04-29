@echo off
chcp 65001 >nul 2>&1
title MelodyFlow Music - 同步到 GitHub

echo.
echo  正在推送至 GitHub...
echo.
git push origin main
echo.
if errorlevel 1 (
    echo  推送失败，请检查网络后重试。
) else (
    echo  推送成功！
)
echo.
pause
