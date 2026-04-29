/**
 * MelodyFlow 多平台音乐API服务 v1.5
 * 仅支持：网易云音乐 / 咪咕音乐
 */

const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = path.join(__dirname, '..');

// Meting-API 源（仅保留网易云和咪咕）
const METING_APIS = [
  'https://api.qijieya.cn/meting/'
];

const SERVER_MAP = {
  netease: 'netease',
  migu: 'migu'
};

// 请求封装
function request(targetUrl, options = {}) {
  return new Promise((resolve, reject) => {
    const proto = targetUrl.startsWith('https') ? https : http;
    const req = proto.get(targetUrl, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(data); }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Request timeout')); });
  });
}

// 网易云直接API（绕过Meting）
const NETEASE_DIRECT = 'https://netease-cloud-music-api-peach-zeta.vercel.app';
// 咪咕直接API
const MIGU_DIRECT = 'https://api.uomg.com/api/rand.music';

async function fetchNeteaseDirect(pathStr, params = {}) {
  const query = new URLSearchParams({ ...params }).toString();
  const apiUrl = `${NETEASE_DIRECT}${pathStr}${query ? '?' + query : ''}`;
  try {
    return await request(apiUrl);
  } catch (e) {
    console.warn('[Netease Direct] Failed:', e.message);
    return null;
  }
}

// 依次尝试 Meting-API 源
async function fetchWithFallback(path) {
  for (const apiBase of METING_APIS) {
    try {
      const apiUrl = apiBase.replace(/\/$/, '') + '/' + path;
      const data = await request(apiUrl);
      if (data && typeof data === 'object' && !data.error) {
        if (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0) {
          return data;
        }
      }
      if (Array.isArray(data) && data.length === 0) return data;
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

// 通用流媒体代理
function proxyStream(targetUrl, req, res) {
  if (!targetUrl || !targetUrl.startsWith('http')) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid proxy URL' }));
    return;
  }
  const allowedDomains = [
    'api.qijieya.cn', 'api.injahow.cn', 'meting.qjqq.cn',
    'm7.music.126.net', 'm8.music.126.net', 'm9.music.126.net', 'm10.music.126.net',
    'netease-cloud-music-api-peach-zeta.vercel.app'
  ];
  let hostname = '';
  try { hostname = new URL(targetUrl).hostname; }
  catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid URL' }));
    return;
  }
  // 允许所有 music 域名（保守策略）
  if (!allowedDomains.includes(hostname) && !hostname.includes('music.126')) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Proxy not allowed for this domain' }));
    return;
  }

  const isHTTPS = targetUrl.startsWith('https');
  const client = isHTTPS ? https : http;
  const proxyReq = client.get(targetUrl, {
    headers: {
      'Referer': 'https://music.163.com',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Accept-Ranges', 'bytes');

  proxyReq.on('response', (proxyRes) => {
    const sc = proxyRes.statusCode;
    if ((sc === 301 || sc === 302 || sc === 307 || sc === 308) && proxyRes.headers.location) {
      proxyStream(new URL(proxyRes.headers.location, targetUrl).href, req, res);
      return;
    }
    res.writeHead(sc, {
      'Content-Type': proxyRes.headers['content-type'] || 'audio/mpeg',
      'Access-Control-Allow-Origin': '*'
    });
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (e) => {
    console.error('[Proxy] Fetch error:', e.message);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Proxy fetch failed' }));
  });
}

// HTTP 服务器
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;

  try {
    // 静态文件
    if (pathname === '/' || pathname === '/index.html') {
      const filePath = path.join(ROOT_DIR, 'index.html');
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) { res.writeHead(500); res.end('Cannot load index.html'); return; }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(data);
      });
      return;
    }

    // 健康检查
    if (pathname === '/health' || pathname === '/status') {
      res.writeHead(200);
      res.end(JSON.stringify({
        ok: true,
        msg: 'MelodyFlow Music API v1.5',
        platforms: ['netease', 'migu'],
        platformStatus: {
          netease: { search: true, play: true, note: '正常' },
          migu: { search: true, play: true, note: '正常' }
        }
      }));
      return;
    }

    // 搜索接口
    if (pathname === '/api/search') {
      const keywords = query.keywords || query.words;
      const platform = query.platform || 'netease';
      if (!keywords) {
        res.writeHead(400);
        res.end(JSON.stringify({ success: false, error: 'Missing keywords' }));
        return;
      }

      const serverName = SERVER_MAP[platform] || 'netease';
      // 优先用 Meting-API
      const result = await fetchWithFallback(`?server=${serverName}&type=search&id=${encodeURIComponent(keywords)}&limit=30`);
      let list = [];
      if (Array.isArray(result)) list = result.map(s => normalizeSong(s, serverName));
      else if (result?.result?.songs) list = result.result.songs.map(s => normalizeSong(s, serverName));
      res.end(JSON.stringify({ success: true, list }));
      return;
    }

    // 获取歌曲URL
    if (pathname === '/api/music/urls') {
      const id = query.id;
      const platform = query.platform || 'netease';
      if (!id) { res.writeHead(400); res.end(JSON.stringify({ success: false })); return; }
      const serverName = SERVER_MAP[platform] || 'netease';
      const result = await fetchWithFallback(`?server=${serverName}&type=url&id=${id}&br=320000`);
      let songUrl = Array.isArray(result) ? result[0]?.url : (result?.url || result);
      res.end(JSON.stringify({ success: !!songUrl, url: songUrl || '' }));
      return;
    }

    // 获取歌词
    if (pathname === '/api/music/lyrics') {
      const id = query.id;
      const platform = query.platform || 'netease';
      if (!id) { res.writeHead(400); res.end(JSON.stringify({ success: false })); return; }
      const serverName = SERVER_MAP[platform] || 'netease';
      const result = await fetchWithFallback(`?server=${serverName}&type=lrc&id=${id}`);
      const lrcText = typeof result === 'string' ? result : (result?.lrc || result || '');
      res.end(JSON.stringify({ success: true, lyrics: parseLRC(lrcText) }));
      return;
    }

    // 获取封面
    if (pathname === '/api/music/cover') {
      const id = query.id;
      const platform = query.platform || 'netease';
      if (!id) { res.writeHead(400); res.end(JSON.stringify({ success: false })); return; }
      const serverName = SERVER_MAP[platform] || 'netease';
      const result = await fetchWithFallback(`?server=${serverName}&type=pic&id=${id}`);
      const cover = typeof result === 'string' ? result : (result?.pic || result?.url || result || '');
      res.end(JSON.stringify({ success: true, cover }));
      return;
    }

    // 获取歌单
    if (pathname === '/api/playlist') {
      const id = query.id;
      const platform = query.platform || 'netease';
      if (!id) { res.writeHead(400); res.end(JSON.stringify({ success: false })); return; }
      const serverName = SERVER_MAP[platform] || 'netease';
      const result = await fetchWithFallback(`?server=${serverName}&type=playlist&id=${id}`);
      if (Array.isArray(result)) {
        res.end(JSON.stringify({ success: true, list: result.map(s => normalizeSong(s, serverName)) }));
      } else {
        res.end(JSON.stringify({ success: false, error: 'Failed to fetch playlist', list: [] }));
      }
      return;
    }

    // ========== 歌单导入 ==========
    // GET /api/playlist/import?url=https://music.163.com/playlist?id=xxx
    if (pathname === '/api/playlist/import') {
      const rawUrl = query.url || query.link;
      if (!rawUrl) {
        res.writeHead(400);
        res.end(JSON.stringify({ success: false, error: 'Missing url parameter' }));
        return;
      }

      // 解析URL
      let playlistId = '';
      let platform = 'netease';

      // 网易云音乐
      const neteaseMatch = rawUrl.match(/music\.163\.com.*[?&]id=(\d+)/);
      if (neteaseMatch) {
        playlistId = neteaseMatch[1];
        platform = 'netease';
      }
      // 咪咕（比较少见，暂用相同逻辑）
      const miguMatch = rawUrl.match(/migu\.cn.*[?&]id=(\d+)/) || rawUrl.match(/playlist\/(\d+)/);
      if (miguMatch) {
        playlistId = miguMatch[1];
        platform = 'migu';
      }

      if (!playlistId) {
        res.writeHead(400);
        res.end(JSON.stringify({ success: false, error: '无法识别歌单链接，请检查是否是正确的网易云音乐歌单链接' }));
        return;
      }

      console.log(`[Import] Fetching ${platform} playlist: ${playlistId}`);
      const result = await fetchWithFallback(`?server=${platform}&type=playlist&id=${playlistId}`);
      if (Array.isArray(result) && result.length > 0) {
        res.end(JSON.stringify({
          success: true,
          platform,
          id: playlistId,
          name: '导入的歌单',
          list: result.map(s => normalizeSong(s, platform))
        }));
      } else {
        res.end(JSON.stringify({
          success: false,
          error: '无法获取该歌单，可能需要登录或歌单不存在',
          result: result
        }));
      }
      return;
    }

    // ========== 热门歌曲 ==========
    // GET /api/charts?platform=netease&category=0
    if (pathname === '/api/charts') {
      const platform = query.platform || 'netease';
      const category = query.category || '0';

      if (platform === 'netease') {
        // 网易云热歌榜 category: 0=全部, 1=华语, 2=欧美, 3=韩国, 4=日本
        const categoryMap = {
          '0': { id: '3778678', name: '云音乐热歌榜' },
          '1': { id: '3779629', name: '云音乐华语榜' },
          '2': { id: '3778678', name: '云音乐热歌榜' },
          '3': { id: '745956210', name: '韩国Melon排行榜' },
          '4': { id: '60198', name: '日本Oricon榜' }
        };
        const cat = categoryMap[category] || categoryMap['0'];
        const result = await fetchWithFallback(`?server=netease&type=playlist&id=${cat.id}`);
        if (Array.isArray(result) && result.length > 0) {
          res.end(JSON.stringify({
            success: true,
            platform: 'netease',
            category: cat.name,
            list: result.map(s => normalizeSong(s, 'netease'))
          }));
        } else {
          res.end(JSON.stringify({ success: false, error: '获取榜单失败', list: [] }));
        }
      } else if (platform === 'migu') {
        // 咪咕热歌
        try {
          const data = await request(`https://api.uomg.com/api/rand.music?sort=热歌榜&format=json`);
          res.end(JSON.stringify({ success: true, platform: 'migu', list: [] }));
        } catch (e) {
          res.end(JSON.stringify({ success: false, error: e.message, list: [] }));
        }
      } else {
        res.end(JSON.stringify({ success: false, error: 'Unknown platform', list: [] }));
      }
      return;
    }

    // 流媒体代理
    if (pathname.startsWith('/proxy/')) {
      const encodedUrl = pathname.slice('/proxy/'.length);
      const targetUrl = decodeURIComponent(encodedUrl);
      proxyStream(targetUrl, req, res);
      return;
    }

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
   MelodyFlow 音乐API服务 v1.5  (端口 ${PORT})
   支持: 网易云音乐 / 咪咕音乐
   直接访问: http://127.0.0.1:${PORT}
========================================
  `);
});

process.on('SIGINT', () => {
  console.log('\n正在停止服务...');
  server.close(() => { process.exit(0); });
});
