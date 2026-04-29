# MelodyFlow

局域网音乐播放器，支持多平台音乐搜索与播放。

## 一键启动

> **前提：需要先安装 [Node.js](https://nodejs.org/)（LTS 版本）**

下载并解压后，双击运行 `start.bat` 即可。

## 手动启动（可选）

如果 `start.bat` 无法使用，可手动启动：

```bash
# 1. 启动音乐服务（端口 3000）
cd music-server
npm install   # 首次运行需要安装依赖
node server.js

# 2. 另开终端，启动用户服务（端口 3001）
cd user-server
npm install
node server.js
```

## 访问地址

启动后打开浏览器访问：

| 场景 | 地址 |
|------|------|
| 本机访问 | http://127.0.0.1:3000 |
| 局域网访问 | http://192.168.x.x:3000 |

## 功能说明

- 🎵 支持 5 大音乐平台：**网易云 / QQ音乐 / 酷狗 / 酷我 / 咪咕**
- 🎨 9 款主题皮肤
- 👤 用户注册登录 / 收藏夹同步
- 📱 支持手机/平板等局域网设备访问

## 技术栈

- 前端：Vue 3（单 HTML 文件）
- 音乐代理：Node.js + Meting-API
- 用户后端：Node.js + JSON 文件存储

## 项目结构

```
MelodyFlow/
├── index.html          # 主页面
├── start.bat           # 一键启动脚本
├── music-server/
│   └── server.js       # 音乐代理服务
└── user-server/
    ├── server.js       # 用户/同步服务
    └── package.json
```
