/**
 * MelodyFlow Music - 用户服务
 * 提供注册、登录、头像上传、数据同步 API
 * 端口: 3001
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { initDb } = require('./db');
const usersRouter = require('./routes/users');
const syncRouter = require('./routes/sync');

// 初始化数据库
initDb();

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件：头像
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 路由
app.use('/api/users', usersRouter);
app.use('/api/sync', syncRouter);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'melodyflow-user-server', port: PORT });
});

// 获取服务器局域网 IP（供前端配置用）
app.get('/api/server-info', (req, res) => {
  const os = require('os');
  let lanIp = '127.0.0.1';
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        lanIp = net.address;
        break;
      }
    }
  }
  res.json({ ip: lanIp, port: PORT });
});

app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  MelodyFlow 用户服务已启动`);
  console.log(`  端口: http://127.0.0.1:${PORT}`);
  console.log(`  头像目录: ${path.join(__dirname, 'uploads')}`);
  console.log(`========================================\n`);
});
