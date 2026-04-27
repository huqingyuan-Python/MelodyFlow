# MelodyFlow - 本地音乐播放器

<div align="center">
  <img src="https://img.shields.io/badge/Platform-Web-blue.svg" alt="Platform">
  <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License">
  <img src="https://img.shields.io/badge/Vue-3.0-brightgreen.svg" alt="Vue">
</div>

> 🎵 一款优雅的本地音乐播放器，界面灵感来自 Apple Music，支持歌词、罗马音、多语言

[English](README.en.md) | [日本語](README.ja.md)

## ✨ 功能特色

### 核心功能
- 📁 **本地音乐导入** - 支持导入本地音频文件（MP3、AAC、WAV 等）
- 🎨 **Apple Music 风格界面** - 现代化设计，沉浸式体验
- 🎵 **歌词显示** - 支持 LRC 格式歌词，自动滚动同步
- 🌸 **日语罗马音** - 日语歌曲可选择显示罗马音对照
- 📋 **播放列表** - 创建、管理自定义播放列表
- ❤️ **收藏功能** - 一键收藏喜欢的歌曲
- 🔍 **搜索功能** - 快速搜索歌曲、艺术家、专辑

### 界面特色
- 🎨 **四套主题** - 深色、浅色、粉色、蓝色
- 🌐 **多语言** - 中文、English、简体中文、日本语
- 📱 **响应式设计** - 完美适配桌面和移动设备
- ✨ **流畅动画** - 平滑过渡，动效细腻

### 数据管理
- 💾 **本地存储** - 所有数据保存在浏览器本地
- 📤 **数据导出** - 一键备份音乐库和设置
- 📥 **数据导入** - 从备份文件恢复数据

## 🚀 快速开始

### 直接使用
1. 下载或克隆本项目
2. 用浏览器打开 `index.html` 即可使用

### 开发
```bash
# 克隆项目
git clone https://github.com/huqingyuan-Python/MelodyFlow.git

# 直接打开
cd MelodyFlow
open index.html
```

## 📖 使用指南

### 导入音乐
1. 点击右上角「添加音乐」按钮
2. 选择本地音频文件
3. 音乐将自动添加到资料库

### 添加歌词
1. 播放音乐后，点击歌词区域的「添加歌词」按钮
2. 输入 LRC 格式的歌词
3. 格式示例：
```
[00:12.34]第一句歌词
[00:15.67]第二句歌词
[00:18.90]第三句歌词
```

### 日语罗马音
- 当检测到日语歌曲时，会自动显示罗马音开关
- 可在设置中开启「默认显示罗马音」

### 创建播放列表
1. 点击侧边栏「+」或进入「播放列表」页面
2. 输入播放列表名称
3. 从歌曲列表添加歌曲到播放列表

## 🎛️ 界面预览

### 深色主题
- 经典深色背景
- 红色强调色

### 浅色主题
- 明亮清新
- 适合白天使用

### 粉色主题
- 少女心设计
- 渐变粉色背景

### 蓝色主题
- 科技感配色
- 蓝紫渐变

## 🛠️ 技术栈

- **框架**: Vue 3 (CDN)
- **样式**: CSS3 + CSS Variables
- **存储**: LocalStorage
- **图标**: Font Awesome 6
- **音频**: Web Audio API

## 📝 License

MIT License - 详见 [LICENSE](LICENSE)

---

Made with ❤️ by [Hu Qingyuan](https://github.com/huqingyuan-Python)
