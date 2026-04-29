/**
 * MelodyFlow 多平台音乐API服务
 * 支持标准 Meting-API 格式，同时支持网易云/QQ音乐/酷狗/酷我/咪咕
 */

const http = require('http');
const https = require('https');
const url = require('url');

// 配置
const PORT = process.env.PORT || 3000;

// 多个免费 Meting-API 源，依次尝试（支持VIP解析、酷狗、酷我、咪咕）
const METING_APIS = [
  'https://api.injahow.cn/meting/',
  'https://api.qijieya.cn/meting/',
  'https://meting.qjqq.cn/'
];

// 平台名称映射（URL 参数名）
const SERVER_MAP = {
  netease: 'netease',
  tencent: 'tencent',
  qqmusic: 'tencent',
  kugou: 'kugou',
  kuwo: 'kuwo',
  migu: 'migu'
};

// 创建 HTTP 请求的 Promise 封装
function request(targetUrl, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = targetUrl.startsWith('https') ? https : http;
    const req = protocol.get(targetUrl, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// 依次尝试多个 API 源（参数顺序: server= 必须放最前）
async function fetchWithFallback(path) {
  for (const apiBase of METING_APIS) {
    try {
      const apiUrl = apiBase.replace(/\/$/, '') + '/' + path;
      const data = await request(apiUrl);
      // 检查是否是有效结果（不是错误对象）
      if (data && typeof data === 'object' && !data.error) {
        if (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0) {
          return data;
        }
      }
      // 空数组也算有效（该 API 真的没数据）
      if (Array.isArray(data) && data.length === 0) {
        return data;
      }
    } catch (e) {
      console.warn(`[Meting] ${apiBase} failed: ${e.message}`);
    }
  }
  return null;
}

// 标准化歌曲数据
function normalizeSong(song, server) {
  return {
    id: song.id || song.songid || song.song_id || 0,
    name: song.name || song.title || song.songname || '未知歌曲',
    artist: Array.isArray(song.artists) ? song.artists.map(a => a.name).join(' / ') :
            song.artist || song.ar?.map(a => a.name).join(' / ') ||
            song.singer?.map(s => s.name).join(' / ') || '未知艺术家',
    album: song.album?.name || song.albumName || song.album || '未知专辑',
    duration: song.duration || (song.interval ? song.interval * 1000 : 0),
    cover: song.cover || song.pic || song.picUrl || song.album?.picUrl || null,
    url: song.url || null,
    lrc: song.lrc || null,
    platform: server
  };
}

// 解析LRC歌词
function parseLRC(lrcText) {
  if (!lrcText || typeof lrcText !== 'string') return [];
  const lines = lrcText.split('\n');
  const result = [];
  for (const line of lines) {
    const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
    if (match) {
      const min = parseInt(match[1]);
      const sec = parseInt(match[2]);
      const ms = parseInt(match[3].padEnd(3, '0'));
      const time = min * 60 + sec + ms / 1000;
      const text = match[4].trim();
      if (text) result.push({ time, text });
    }
  }
  return result;
}

// HTTP 服务器
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;

  try {
    // =============================================
    // 标准 Meting-API 格式支持
    // GET /?type=search&id=关键词&server=netease&limit=30
    // GET /?type=url&id=歌曲ID&server=netease&br=320000
    // GET /?type=lrc&id=歌曲ID&server=netease
    // GET /?type=pic&id=歌曲ID&server=netease
    // GET /?type=song&id=歌曲ID&server=netease
    // GET /?type=playlist&id=歌单ID&server=netease
    // =============================================
    if (pathname === '/' || pathname === '/meting/') {
      const type = query.type || '';
      const id = query.id || '';
      const serverName = SERVER_MAP[query.server] || 'netease';
      const br = query.br || 320000;
      const limit = parseInt(query.limit) || 30;

      let result;
      switch (type) {
        case 'search':
          result = await fetchWithFallback(`?server=${serverName}&type=search&id=${encodeURIComponent(id)}&limit=${limit}`);
          if (Array.isArray(result)) {
            res.end(JSON.stringify(result.map(s => normalizeSong(s, serverName))));
          } else if (result?.result?.songs) {
            res.end(JSON.stringify(result.result.songs.map(s => normalizeSong(s, serverName))));
          } else {
            res.end(JSON.stringify(result || []));
          }
          return;

        case 'url':
          result = await fetchWithFallback(`?server=${serverName}&type=url&id=${id}&br=${br}`);
          if (Array.isArray(result)) {
            res.end(JSON.stringify(result[0]?.url || ''));
          } else if (typeof result === 'string') {
            res.end(JSON.stringify(result));
          } else {
            res.end(JSON.stringify(result?.url || ''));
          }
          return;

        case 'lrc':
          result = await fetchWithFallback(`?server=${serverName}&type=lrc&id=${id}`);
          if (typeof result === 'string') {
            res.end(JSON.stringify(result));
          } else {
            res.end(JSON.stringify(result?.lrc || result || ''));
          }
          return;

        case 'pic':
          result = await fetchWithFallback(`?server=${serverName}&type=pic&id=${id}`);
          if (typeof result === 'string') {
            res.end(JSON.stringify(result));
          } else {
            res.end(JSON.stringify(result?.pic || result?.url || result || ''));
          }
          return;

        case 'song':
          result = await fetchWithFallback(`?server=${serverName}&type=song&id=${id}`);
          res.end(JSON.stringify(result));
          return;

        case 'playlist':
          result = await fetchWithFallback(`?server=${serverName}&type=playlist&id=${id}`);
          if (Array.isArray(result)) {
            res.end(JSON.stringify(result.map(s => normalizeSong(s, serverName))));
          } else {
            res.end(JSON.stringify(result || []));
          }
          return;

        default:
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Unknown type. Use: search, url, lrc, pic, song, playlist' }));
          return;
      }
    }

    // =============================================
    // 原有自定义 API（兼容旧版）
    // =============================================

    // 健康检查
    if (pathname === '/health' || pathname === '/status') {
      res.writeHead(200);
      res.end(JSON.stringify({
        ok: true,
        msg: 'MelodyFlow Music API Server Running',
        vipSupport: true,
        platforms: ['netease', 'tencent', 'kugou', 'kuwo', 'migu']
      }));
      return;
    }

    // 搜索接口
    if (pathname === '/api/search') {
      const keywords = query.keywords || query.words;
      const platform = query.platform || 'netease';
      if (!keywords) {
        res.writeHead(400);
        res.end(JSON.stringify({ success: false, error: 'Missing keywords parameter' }));
        return;
      }
      const serverName = SERVER_MAP[platform] || 'netease';
      const result = await fetchWithFallback(`?server=${serverName}&type=search&id=${encodeURIComponent(keywords)}&limit=30`);
      if (Array.isArray(result)) {
        res.end(JSON.stringify({ success: true, list: result.map(s => normalizeSong(s, serverName)) }));
      } else if (result?.result?.songs) {
        res.end(JSON.stringify({ success: true, list: result.result.songs.map(s => normalizeSong(s, serverName)) }));
      } else {
        res.end(JSON.stringify({ success: true, list: [] }));
      }
      return;
    }

    // 获取歌曲URL
    if (pathname === '/api/music/urls') {
      const id = query.id;
      const platform = query.platform || 'netease';
      if (!id) {
        res.writeHead(400);
        res.end(JSON.stringify({ success: false, error: 'Missing id parameter' }));
        return;
      }
      const serverName = SERVER_MAP[platform] || 'netease';
      const br = parseInt(query.br) || 320000;
      const result = await fetchWithFallback(`?server=${serverName}&type=url&id=${id}&br=${br}`);
      let songUrl = Array.isArray(result) ? result[0]?.url : (result?.url || result);
      res.end(JSON.stringify({ success: !!songUrl, url: songUrl || '', quality: '320k' }));
      return;
    }

    // 获取歌词
    if (pathname === '/api/music/lyrics') {
      const id = query.id;
      const platform = query.platform || 'netease';
      if (!id) {
        res.writeHead(400);
        res.end(JSON.stringify({ success: false, error: 'Missing id parameter' }));
        return;
      }
      const serverName = SERVER_MAP[platform] || 'netease';
      const result = await fetchWithFallback(`?server=${serverName}&type=lrc&id=${id}`);
      const lrcText = typeof result === 'string' ? result : (result?.lrc || result || '');
      res.end(JSON.stringify({ success: true, lyrics: parseLRC(lrcText), translation: [] }));
      return;
    }

    // 获取封面
    if (pathname === '/api/music/cover') {
      const id = query.id;
      const platform = query.platform || 'netease';
      if (!id) {
        res.writeHead(400);
        res.end(JSON.stringify({ success: false, error: 'Missing id parameter' }));
        return;
      }
      const serverName = SERVER_MAP[platform] || 'netease';
      const result = await fetchWithFallback(`?server=${serverName}&type=pic&id=${id}`);
      const cover = typeof result === 'string' ? result : (result?.pic || result?.url || result || '');
      res.end(JSON.stringify({ success: true, cover }));
      return;
    }

    // 获取歌曲详情
    if (pathname === '/api/music/song') {
      const id = query.id;
      const platform = query.platform || 'netease';
      if (!id) {
        res.writeHead(400);
        res.end(JSON.stringify({ success: false, error: 'Missing id parameter' }));
        return;
      }
      const serverName = SERVER_MAP[platform] || 'netease';
      const result = await fetchWithFallback(`?server=${serverName}&type=song&id=${id}`);
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, data: result }));
      return;
    }

    // 获取歌单
    if (pathname === '/api/playlist') {
      const id = query.id;
      const platform = query.platform || 'netease';
      if (!id) {
        res.writeHead(400);
        res.end(JSON.stringify({ success: false, error: 'Missing id parameter' }));
        return;
      }
      const serverName = SERVER_MAP[platform] || 'netease';
      const result = await fetchWithFallback(`?server=${serverName}&type=playlist&id=${id}`);
      if (Array.isArray(result)) {
        res.end(JSON.stringify({ success: true, list: result.map(s => normalizeSong(s, serverName)) }));
      } else {
        res.end(JSON.stringify({ success: false, error: 'Failed to fetch playlist', list: [] }));
      }
      return;
    }

    // 未知路由
    res.writeHead(404);
    res.end(JSON.stringify({ success: false, error: 'Not found' }));

  } catch (e) {
    console.error('Server error:', e);
    res.writeHead(500);
    res.end(JSON.stringify({ success: false, error: e.message }));
  }
});

server.listen(PORT, () => {
  console.log(`
========================================
   MelodyFlow 音乐API服务  (端口 ${PORT})
   支持标准 Meting-API 格式
   备用源: injahow / qijieya / qjqq
========================================
   服务地址: http://127.0.0.1:${PORT}
   标准格式: /?type=search&id=关键词&server=netease
   健康检查: /health
========================================
  `);
});

process.on('SIGINT', () => {
  console.log('\n正在停止服务...');
  server.close(() => {
    console.log('服务已停止');
    process.exit(0);
  });
});
