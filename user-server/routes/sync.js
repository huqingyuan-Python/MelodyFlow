/**
 * MelodyFlow Music - 数据同步路由
 * 获取/保存用户数据（收藏、播放列表、历史、设置、播放进度）
 */

const express = require('express');
const router = express.Router();
const db = require('../db');

// ==================== 验证用户 ====================

function verifyUser(userId, username) {
  const user = db.findUserById(Number(userId));
  return !!(user && user.username === username);
}

// ==================== GET /api/sync/get - 获取用户数据 ====================
router.get('/get', (req, res) => {
  const { userId, username } = req.query;

  if (!userId || !username) {
    return res.status(400).json({ ok: false, msg: '缺少参数' });
  }

  if (!verifyUser(userId, username)) {
    return res.status(403).json({ ok: false, msg: '用户验证失败' });
  }

  const userData = db.getUserData(Number(userId));
  // 获取更新时间的粗略值（通过读取用户记录）
  const user = db.findUserById(Number(userId));
  res.json({ ok: true, data: userData, updated_at: user ? user.updated_at : null });
});

// ==================== POST /api/sync/save - 保存用户数据 ====================
router.post('/save', (req, res) => {
  const { userId, username, data } = req.body;

  if (!userId || !username) {
    return res.status(400).json({ ok: false, msg: '缺少参数' });
  }

  if (!verifyUser(userId, username)) {
    return res.status(403).json({ ok: false, msg: '用户验证失败' });
  }

  if (data === undefined || data === null) {
    return res.status(400).json({ ok: false, msg: '数据不能为空' });
  }

  const cleanData = JSON.parse(JSON.stringify(data));
  const dataStr = JSON.stringify(cleanData);

  if (dataStr.length > 5 * 1024 * 1024) {
    return res.status(413).json({ ok: false, msg: '数据过大，最大支持5MB' });
  }

  db.saveUserData(Number(userId), cleanData);
  res.json({ ok: true, updated_at: new Date().toISOString() });
});

// ==================== GET /api/sync/status - 同步状态检查 ====================
router.get('/status', (req, res) => {
  const { userId, username } = req.query;

  if (!userId || !username) {
    return res.status(400).json({ ok: false, msg: '缺少参数' });
  }

  if (!verifyUser(userId, username)) {
    return res.status(403).json({ ok: false, msg: '用户验证失败' });
  }

  const userData = db.getUserData(Number(userId));
  const hasData = Object.keys(userData).length > 0;
  const user = db.findUserById(Number(userId));

  res.json({ ok: true, synced: hasData, updated_at: user ? user.updated_at : null });
});

module.exports = router;
