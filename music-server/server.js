/**
 * MelodyFlow 多平台音乐API服务
 * 支持标准 Meting-API 格式，同时支持网易云/QQ音乐/酷狗/酷我/咪咕
 */

const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');

// 配置
const PORT = process.env.PORT || 3000;
// index.html 放在 music-server 同级目录（即项目根目录）
const ROOT_DIR = path.join(__dirname, '..');

// 多个免费 Meting-API 源，依次尝试
// 注意：injahow 和 qjqq 已失效，只保留 qijieya
const METING_APIS = [
  'https://api.qijieya.cn/meting/'
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

// QQ音乐直接搜索（绕过 Meting-API 的限制）
async function qqMusicSearch(keyword, limit = 30) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'shc.y.qq.com',
      path: `/soso/fcgi-bin/search_for_qq_cp?g_tk=5381&w=${encodeURIComponent(keyword)}&format=json&p=1&n=${limit}`,
      headers: {
        'Referer': 'https://y.qq.com',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 15000
    };
    https.get(options, (apiRes) => {
      let data = '';
      apiRes.on('data', chunk => data += chunk);
      apiRes.on('end', () => {
        try {
          const json = JSON.parse(data);
          const songs = json?.data?.song?.list || [];
          resolve(songs.map(song => ({
            id: song.songmid,
            name: song.songname,
            artist: (song.singer || []).map(s => s.name).join(' / '),
            album: song.albumname,
            duration: song.interval ? song.interval * 1000 : 0,
            cover: song.albummid
              ? `https://y.gtimg.cn/music/photo_new/T002R300x300M000${song.albummid}.jpg`
              : null,
            url: null, // 播放需要 vkey，暂时无法提供
            lrc: null,
            platform: 'tencent'
          })));
        } catch (e) {
          console.error('[QQ Music] Search parse error:', e.message);
          resolve([]);
        }
      });
    }).on('error', (e) => {
      console.error('[QQ Music] Search request failed:', e.message);
      resolve([]);
    });
  });
}

// 酷狗音乐官方搜索（绕过 Meting-API 的空数据问题）
async function kugouSearch(keyword, limit = 30) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'mobilecdn.kugou.com',
      path: `/api/v3/search/song?keyword=${encodeURIComponent(keyword)}&page=1&pagesize=${limit}&showtype=1`,
      headers: {
        'Referer': 'https://www.kugou.com',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 15000,
      rejectUnauthorized: false  // 酷狗证书问题，忽略验证
    };
    https.get(options, (apiRes) => {
      let data = '';
      apiRes.on('data', chunk => data += chunk);
      apiRes.on('end', () => {
        try {
          const json = JSON.parse(data);
          const songs = json?.data?.info || [];
          resolve(songs.map(song => {
            // 优先用 320hash，没有则用普通 hash
            const hash = song['320hash'] || song.hash;
            const fileExt = hash ? '.mp3' : '';
            // 酷狗播放 URL：直接用 hash 拼接
            const playUrl = hash
              ? `https://wwwapi.kugou.com/yy/index.php?r=play/getdata&hash=${hash}&mid=${hash}`
              : null;
            const cover = song.trans_param?.union_cover?.replace(/\{size\}/g, '400') || null;
            return {
              id: song.hash || song['320hash'] || String(Math.random()),
              name: song.songname || '未知歌曲',
              artist: song.singername || '未知艺术家',
              album: song.album_name || '',
              duration: song.duration ? song.duration * 1000 : 0,
              cover: cover,
              url: playUrl,
              lrc: null,
              platform: 'kugou',
              _kugouHash: hash,
              _kugou320Hash: song['320hash']
            };
          }));
        } catch (e) {
          console.error('[Kugou] Search parse error:', e.message);
          resolve([]);
        }
      });
    }).on('error', (e) => {
      console.error('[Kugou] Search request failed:', e.message);
      resolve([]);
    });
  });
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
    // 静态文件服务（直接访问首页用）
    // =============================================
    if (pathname === '/' || pathname === '/index.html') {
      const filePath = path.join(ROOT_DIR, 'index.html');
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          res.writeHead(500);
          res.end('Cannot load index.html');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(data);
      });
      return;
    }

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
        platforms: ['netease', 'tencent', 'kugou', 'kuwo', 'migu'],
        platformStatus: {
          netease: { search: true, play: true, note: '正常' },
          tencent: { search: true, play: true, note: '正常（非VIP账号仅能获取VIP歌曲测试片段）' },
          kugou: { search: true, play: true, note: '搜索正常，播放需VIP账号' },
          kuwo: { search: false, play: false, note: 'API需登录验证，暂不支持' },
          migu: { search: true, play: true, note: '正常（网易云数据转发）' }
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
        res.end(JSON.stringify({ success: false, error: 'Missing keywords parameter' }));
        return;
      }

      // QQ音乐直接使用官方搜索API（不走 Meting-API）
      if (platform === 'tencent') {
        const qqData = await qqMusicSearch(keywords, parseInt(query.limit) || 30);
        res.end(JSON.stringify({ success: true, list: qqData }));
        return;
      }

      // 酷狗使用官方搜索API（不走 Meting-API，因为后者返回空）
      if (platform === 'kugou') {
        const kugouData = await kugouSearch(keywords, parseInt(query.limit) || 30);
        res.end(JSON.stringify({ success: true, list: kugouData }));
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

    // 酷狗播放URL（使用官方 API）
    if (pathname === '/api/kugou/play') {
      const hash = query.hash;
      if (!hash) {
        res.writeHead(400);
        res.end(JSON.stringify({ success: false, error: 'Missing hash parameter' }));
        return;
      }
      try {
        const data = await new Promise((resolve, reject) => {
          const options = {
            hostname: 'wwwapi.kugou.com',
            path: `/yy/index.php?r=play/getdata&hash=${hash}&mid=${hash}`,
            headers: {
              'Referer': 'https://www.kugou.com',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Cookie': 'kg_mid=melodyflow_test'
            },
            timeout: 10000
          };
          https.get(options, (apiRes) => {
            let body = '';
            apiRes.on('data', chunk => body += chunk);
            apiRes.on('end', () => {
              try { resolve(JSON.parse(body)); } catch { resolve(null); }
            });
          }).on('error', reject);
        });
        const playUrl = data?.data?.play_url || data?.data?.play_backup_url || null;
        const img = data?.data?.img || null;
        if (playUrl) {
          res.end(JSON.stringify({ success: true, url: playUrl, cover: img, quality: '320k' }));
        } else {
          res.end(JSON.stringify({ success: false, error: '无法获取播放链接', detail: data?.data?.err_msg || '' }));
        }
      } catch(e) {
        res.end(JSON.stringify({ success: false, error: e.message }));
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

    // QQ音乐播放URL（通过 vkey API 获取）
    if (pathname === '/api/tencent/url') {
      const songmid = query.songmid;
      if (!songmid) {
        res.writeHead(400);
        res.end(JSON.stringify({ success: false, error: 'Missing songmid parameter' }));
        return;
      }
      try {
        const data = await new Promise((resolve, reject) => {
          const body = JSON.stringify({
            req: {
              module: 'vkey.GetVkeyServer',
              method: 'CgiGetVkey',
              param: {
                guid: String(Math.floor(Math.random() * 9000000 + 1000000)),
                songmid: [songmid],
                songtype: [0],
                uin: '1234567890',
                loginkey: '',
                device: 'PC',
                platform: '20'
              }
            }
          });
          const options = {
            hostname: 'u.y.qq.com',
            path: '/cgi-bin/musicu.fcg',
            method: 'POST',
            headers: {
              'Referer': 'https://y.qq.com',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(body)
            },
            timeout: 10000
          };
          const req = https.request(options, (apiRes) => {
            let data = '';
            apiRes.on('data', chunk => data += chunk);
            apiRes.on('end', () => {
              try { resolve(JSON.parse(data)); } catch { resolve(null); }
            });
          });
          req.on('error', reject);
          req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
          req.write(body);
          req.end();
        });

        const info = data?.req?.data?.midurlinfo?.[0];
        if (info && info.purl) {
          // 非VIP歌曲有 purl
          res.end(JSON.stringify({ success: true, url: info.purl, quality: '128k' }));
        } else if (data?.req?.data?.testfilewifi) {
          // VIP歌曲返回 testfilewifi（需包含完整路径）
          const base = data.req.data.sip?.[0] || 'http://aqqmusic.tc.qq.com/';
          const url = base + data.req.data.testfilewifi.split('?')[0] + '?' + data.req.data.testfilewifi.split('?').slice(1).join('?');
          res.end(JSON.stringify({ success: true, url, quality: '128k', note: 'vip-test-url' }));
        } else {
          res.end(JSON.stringify({ success: false, error: '无法获取播放链接（非VIP或版权限制）' }));
        }
      } catch(e) {
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
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

// =============================================
// 流媒体代理端点 - 解决酷狗等平台播放问题
// 将第三方 API 的 type=url 代理为真实音频流
// =============================================
    if (pathname.startsWith('/proxy/')) {
      const encodedUrl = pathname.slice('/proxy/'.length);
      const targetUrl = decodeURIComponent(encodedUrl);
      if (!targetUrl || !targetUrl.startsWith('http')) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid proxy URL' }));
        return;
      }

      // 只代理已知的音乐 API 域名
      const allowedDomains = [
        'api.qijieya.cn', 'api.injahow.cn', 'meting.qjqq.cn',
        // QQ音乐 CDN
        'aqqmusic.tc.qq.com', 'sjy6.stream.qqmusic.qq.com',
        'dl.stream.qqmusic.qq.com', 'dl.qqmusic.qq.com'
      ];
      // 允许跟随重定向的音乐 CDN 域名（跟随最多3次）
      const musicCDNDomains = ['m7.music.126.net', 'm8.music.126.net', 'm9.music.126.net', 'm10.music.126.net'];
      let hostname = '';
      try {
        const urlObj = new URL(targetUrl);
        hostname = urlObj.hostname;
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid URL' }));
        return;
      }
      if (!allowedDomains.includes(hostname)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Proxy not allowed for this domain' }));
        return;
      }

      // 通用的流媒体请求函数（支持重定向跟随）
      const streamMedia = (mediaUrl, redirectCount = 0) => {
        const isHTTPS = mediaUrl.startsWith('https://');
        const client = isHTTPS ? https : http;
        const clientModule = client;

        let reqHostname = '';
        try { reqHostname = new URL(mediaUrl).hostname; } catch {}

        // 如果是音乐CDN域名，也加入允许列表（仅限跟随重定向）
        if (musicCDNDomains.includes(reqHostname)) {
          // CORS 允许跨域
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Accept-Ranges', 'bytes');
        }

        const req = clientModule.get(mediaUrl, {
          headers: {
            'Referer': 'https://y.qq.com',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': '*/*',
          }
        });

        let responded = false;
        const safeRespond = (statusCode, headers, body) => {
          if (!responded) {
            responded = true;
            try {
              if (body === null) {
                res.writeHead(statusCode, headers);
              } else {
                res.end(body);
              }
            } catch (e) {
              console.error('[Proxy] Write error:', e.message);
            }
          }
        };

        req.on('response', (proxyRes) => {
          const statusCode = proxyRes.statusCode || 200;

          // 处理重定向（最多跟随3次）
          if ((statusCode === 301 || statusCode === 302 || statusCode === 303 || statusCode === 307 || statusCode === 308) && redirectCount < 3) {
            const location = proxyRes.headers['location'];
            if (location) {
              // 清理旧响应，防止重复写入
              proxyRes.on('data', () => {});
              proxyRes.on('end', () => {});
              // 跟随重定向
              const redirectUrl = new URL(location, mediaUrl).href;
              console.log(`[Proxy] Following redirect to: ${redirectUrl}`);
              streamMedia(redirectUrl, redirectCount + 1);
              return;
            }
          }

          const contentType = proxyRes.headers['content-type'] || 'audio/mpeg';
          safeRespond(statusCode, {
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*',
            'Accept-Ranges': 'bytes',
          }, null);

          proxyRes.pipe(res);
        });

        req.on('error', (e) => {
          console.error('[Proxy] Fetch error:', e.message);
          safeRespond(502, { 'Content-Type': 'application/json' }, JSON.stringify({ error: 'Proxy fetch failed: ' + e.message }));
        });

        req.on('timeout', () => {
          req.destroy();
          safeRespond(504, { 'Content-Type': 'application/json' }, JSON.stringify({ error: 'Proxy timeout' }));
        });
      };

      streamMedia(targetUrl);
      return;
    }

    // =============================================
    // 未知路由
    // =============================================
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
   支持: 网易云/QQ音乐/酷狗/酷我/咪咕
   直接搜索: http://127.0.0.1:${PORT}
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
