/**
 * MelodyFlow Music - 用户路由
 * 注册、登录、头像、用户名验证
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

// ==================== 敏感词过滤 ====================

const SENSITIVE_WORDS = new Set([
  'fuck', 'shit', 'asshole', 'bitch', 'damn', 'bastard', 'crap', 'piss', 'dick', 'cock',
  'suck', 'sucks', 'wtf', 'omfg', 'lmao', 'lmfao', 'nigger', 'nigga', 'faggot', 'retard',
  '弱智', '智障', '脑残', '傻逼', '煞笔', '傻比', 'sb', 'SB', '傻b',
  '我操', '我艹', '我草', '我曹', '卧槽', '尼玛', '你妈', '他妈',
  '去你妈', '操你', '草你', '艹你', '肏你', '我日', '干你', '干你妈',
  '死妈', '狗妈', '贱人', '贱货', '骚货', '贱逼', '贱比', '臭逼', '臭比',
  '滚蛋', '滚你', '滚远', '死开', '去死', '你死', '必死', '找死',
  '恶心', '恶臭', '下头', '普信', '下贱', '卑微', '舔狗',
  '嫖客', '鸭子', '人妖', '变态', '黄片', '色情', '黄色',
  '人渣', '畜生', '禽兽', '王八', '王八蛋', '乌龟', '绿帽',
  '狗东西', '狗杂种', '野种', '杂种', '私生子',
  'admin', 'root', 'administrator', 'system'
]);

function containsSensitiveWord(text) {
  const lower = text.toLowerCase();
  for (const word of SENSITIVE_WORDS) {
    if (lower.includes(word)) return true;
  }
  return false;
}

// ==================== 用户名验证 ====================

function isValidUsername(username) {
  if (!username || typeof username !== 'string') return false;
  if (username.length < 2 || username.length > 20) return false;
  return /^[a-zA-Z0-9_\u4e00-\u9fff\u3040-\u30ff]+$/.test(username) && !/^[0-9_]+$/.test(username);
}

function isUsernameAvailable(username) {
  return !db.findUserByUsername(username);
}

// ==================== 随机用户名生成 ====================

function generateRandomSuffix(length = 4) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateDefaultUsername(createdAt) {
  const date = new Date(createdAt);
  const yy = String(date.getFullYear()).slice(2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const datePart = `${yy}${mm}${dd}`;

  for (let len = 4; len <= 6; len++) {
    for (let attempt = 0; attempt < 20; attempt++) {
      const suffix = generateRandomSuffix(len);
      const username = `MF_${datePart}${suffix}`;
      if (isUsernameAvailable(username)) {
        return username;
      }
    }
  }
  return `MF_${datePart}${uuidv4().replace(/-/g, '').slice(0, 6)}`;
}

// ==================== 头像上传配置 ====================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
      return cb(new Error('只允许上传图片文件'));
    }
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('只允许上传 JPG/PNG/GIF/WEBP 格式图片'));
  }
});

// ==================== API 路由 ====================

// POST /api/users/register - 注册
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ ok: false, msg: '密码至少需要6个字符' });
    }

    const createdAt = new Date().toISOString();
    let finalUsername = username;

    if (!username || !username.trim()) {
      finalUsername = generateDefaultUsername(createdAt);
    } else {
      finalUsername = username.trim();

      if (!isValidUsername(finalUsername)) {
        return res.status(400).json({
          ok: false,
          msg: '用户名只能使用中文、英文字母、数字和下划线，长度2-20位'
        });
      }

      if (containsSensitiveWord(finalUsername)) {
        return res.status(400).json({ ok: false, msg: '用户名包含敏感词，请换一个' });
      }

      if (!isUsernameAvailable(finalUsername)) {
        return res.status(409).json({ ok: false, msg: '用户名已被占用，请换一个' });
      }
    }

    const password_hash = await bcrypt.hash(password, 10);
    const user = db.createUser(finalUsername, password_hash);

    res.status(201).json({
      ok: true,
      user: { id: user.id, username: user.username, avatar: user.avatar, created_at: user.created_at }
    });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(409).json({ ok: false, msg: '用户名已被占用' });
    }
    console.error('Register error:', err);
    res.status(500).json({ ok: false, msg: '服务器错误，请稍后重试' });
  }
});

// POST /api/users/login - 登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ ok: false, msg: '请填写用户名和密码' });
    }

    const user = db.findUserByUsername(username.trim());
    if (!user) {
      return res.status(401).json({ ok: false, msg: '用户名或密码错误' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ ok: false, msg: '用户名或密码错误' });
    }

    db.updateUsername(user.id, user.username); // 只触发 updated_at 更新
    res.json({
      ok: true,
      user: { id: user.id, username: user.username, avatar: user.avatar, created_at: user.created_at }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ ok: false, msg: '服务器错误，请稍后重试' });
  }
});

// GET /api/users/me - 获取当前用户信息
router.get('/me', (req, res) => {
  const { id, username } = req.query;
  if (!id || !username) return res.status(400).json({ ok: false, msg: '缺少参数' });

  const user = db.findUserById(Number(id));
  if (!user || user.username !== username) {
    return res.status(404).json({ ok: false, msg: '用户不存在' });
  }
  res.json({ ok: true, user: { id: user.id, username: user.username, avatar: user.avatar, created_at: user.created_at } });
});

// POST /api/users/update-username - 更新用户名
router.post('/update-username', (req, res) => {
  const { id, oldUsername, newUsername } = req.body;

  if (!id || !oldUsername || !newUsername) {
    return res.status(400).json({ ok: false, msg: '缺少参数' });
  }

  if (!isValidUsername(newUsername)) {
    return res.status(400).json({ ok: false, msg: '用户名只能使用中文、英文字母、数字和下划线，长度2-20位' });
  }

  if (containsSensitiveWord(newUsername)) {
    return res.status(400).json({ ok: false, msg: '用户名包含敏感词，请换一个' });
  }

  const user = db.findUserById(Number(id));
  if (!user || user.username !== oldUsername) {
    return res.status(403).json({ ok: false, msg: '用户验证失败' });
  }

  if (!isUsernameAvailable(newUsername)) {
    return res.status(409).json({ ok: false, msg: '用户名已被占用，请换一个' });
  }

  db.updateUsername(Number(id), newUsername);
  res.json({ ok: true, username: newUsername });
});

// POST /api/users/upload-avatar - 上传头像
router.post('/upload-avatar', upload.single('avatar'), (req, res) => {
  const { userId, username } = req.body;

  if (!req.file) return res.status(400).json({ ok: false, msg: '请上传图片文件' });

  const user = db.findUserById(Number(userId));
  if (!user || user.username !== username) {
    return res.status(403).json({ ok: false, msg: '用户验证失败' });
  }

  const avatarPath = `/uploads/${req.file.filename}`;

  // 删除旧头像
  if (user.avatar) {
    const oldPath = path.join(__dirname, '..', user.avatar);
    try { if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath); } catch (e) { /* ignore */ }
  }

  db.updateAvatar(Number(userId), avatarPath);
  res.json({ ok: true, avatar: avatarPath });
});

// POST /api/users/change-password - 修改密码
router.post('/change-password', async (req, res) => {
  const { id, username, oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ ok: false, msg: '新密码至少需要6个字符' });
  }

  const user = db.findUserById(Number(id));
  if (!user || user.username !== username) {
    return res.status(403).json({ ok: false, msg: '用户验证失败' });
  }

  const valid = await bcrypt.compare(oldPassword, user.password_hash);
  if (!valid) return res.status(401).json({ ok: false, msg: '原密码错误' });

  const hash = await bcrypt.hash(newPassword, 10);
  db.updatePassword(Number(id), hash);
  res.json({ ok: true, msg: '密码修改成功' });
});

module.exports = router;
