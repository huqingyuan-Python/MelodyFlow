/**
 * MelodyFlow Music - JSON 文件数据库模块
 * 替代 better-sqlite3，无需 C++ 编译
 */

const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'melodyflow.json');
let data = { users: [], user_data: [] };

function loadDb() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, 'utf8');
      data = JSON.parse(raw);
      if (!data.users) data.users = [];
      if (!data.user_data) data.user_data = [];
      console.log('  [DB] 数据库加载完成，记录数:', data.users.length);
    } else {
      saveDb();
      console.log('  [DB] 新建数据库文件:', DB_PATH);
    }
  } catch (e) {
    console.error('  [DB] 加载失败，创建新数据库:', e.message);
    data = { users: [], user_data: [] };
    saveDb();
  }
}

function saveDb() {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('  [DB] 保存失败:', e.message);
  }
}

function initDb() {
  loadDb();
}

// 查询用户
function findUser(query) {
  if (query.id) return data.users.find(u => u.id === query.id) || null;
  if (query.username) return data.users.find(u => u.username === query.username) || null;
  return null;
}

function findUserById(id) { return data.users.find(u => u.id === id) || null; }
function findUserByUsername(username) { return data.users.find(u => u.username === username) || null; }

// 创建用户
function createUser(username, passwordHash) {
  const now = new Date().toISOString();
  const newId = data.users.length > 0 ? Math.max(...data.users.map(u => u.id)) + 1 : 1;
  const user = { id: newId, username, password_hash: passwordHash, avatar: '', created_at: now, updated_at: now };
  data.users.push(user);
  data.user_data.push({ id: data.user_data.length + 1, user_id: newId, data: '{}', updated_at: now });
  saveDb();
  return user;
}

// 更新用户名
function updateUsername(userId, newUsername) {
  const user = data.users.find(u => u.id === userId);
  if (user) {
    user.username = newUsername;
    user.updated_at = new Date().toISOString();
    saveDb();
  }
  return user;
}

// 更新头像
function updateAvatar(userId, avatarPath) {
  const user = data.users.find(u => u.id === userId);
  if (user) {
    user.avatar = avatarPath;
    user.updated_at = new Date().toISOString();
    saveDb();
  }
  return user;
}

// 更新密码
function updatePassword(userId, passwordHash) {
  const user = data.users.find(u => u.id === userId);
  if (user) {
    user.password_hash = passwordHash;
    user.updated_at = new Date().toISOString();
    saveDb();
  }
  return user;
}

// 获取用户数据
function getUserData(userId) {
  const ud = data.user_data.find(d => d.user_id === userId);
  if (!ud) return {};
  try { return JSON.parse(ud.data); } catch { return {}; }
}

// 保存用户数据
function saveUserData(userId, userDataObj) {
  let ud = data.user_data.find(d => d.user_id === userId);
  const now = new Date().toISOString();
  if (!ud) {
    ud = { id: data.user_data.length + 1, user_id: userId, data: '{}', updated_at: now };
    data.user_data.push(ud);
  }
  ud.data = JSON.stringify(userDataObj);
  ud.updated_at = now;
  saveDb();
}

module.exports = {
  initDb,
  findUserById,
  findUserByUsername,
  createUser,
  updateUsername,
  updateAvatar,
  updatePassword,
  getUserData,
  saveUserData
};
