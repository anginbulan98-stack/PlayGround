/**
 * Guoke Method - Cloudflare Worker proxy TikTok (mirror server.py).
 * Deploy:  cd worker && npx wrangler deploy
 * Lalu arahkan route /api/* domain situs ke worker ini, atau set
 * window.GUOKE_PROXY = 'https://<worker>.workers.dev' sebelum script utama.
 *
 * GET /api/health | /api/resolve?url= | /api/oembed?url= | /api/video?url=
 * Cache 5 menit via Cache API. Tanpa tebakan: field kosong -> null.
 */
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const TTL = 300;
const VIDEO_RE = /tiktok\.com\/@([^/?#]+)\/video\/(\d+)/;
const SCRIPT_RE = /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>(.*?)<\/script>/s;
const BLOCK = ['captcha', 'verify-page', 'challenge', 'slidercaptcha', 'secsdk'];

const j = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' },
});
const err = (code, message, status = 502) => j({ ok: false, code, message }, status);
const toInt = (v) => {
  const n = parseInt(String(v ?? '').replace(/,/g, ''), 10);
  return Number.isFinite(n) ? n : null;
};

function findItem(scope) {
  const direct = scope?.['webapp.video-detail']?.itemInfo?.itemStruct;
  if (direct) return direct;
  const stack = [scope];
  while (stack.length) {
    const o = stack.pop();
    if (o && typeof o === 'object') {
      if (o.itemStruct && typeof o.itemStruct === 'object') return o.itemStruct;
      for (const v of Object.values(o)) stack.push(v);
    }
  }
  return null;
}

function normalize(item) {
  const author = item.author || {}, stats = item.stats || {}, video = item.video || {}, music = item.music || {};
  const gears = (video.bitrateInfo || []).map((g) => {
    const pa = g.PlayAddr || {};
    return {
      gear: g.GearName ?? null, codec: g.CodecType ?? null, format: g.Format ?? null,
      width: toInt(pa.Width), height: toInt(pa.Height), fps: toInt(g.BitrateFPS),
      bitrateBps: toInt(g.Bitrate), sizeBytes: toInt(pa.DataSize),
      playUrl: (pa.UrlList || [null])[0],
    };
  });
  return {
    videoId: String(item.id ?? ''), username: author.uniqueId ?? null, nickname: author.nickname ?? null,
    verified: !!author.verified, privateAccount: !!author.privateAccount,
    avatar: author.avatarLarger || author.avatarMedium || null, caption: item.desc ?? null,
    createTime: toInt(item.createTime), durationSec: toInt(video.duration),
    stats: {
      views: toInt(stats.playCount), likes: toInt(stats.diggCount),
      comments: toInt(stats.commentCount), shares: toInt(stats.shareCount), collects: toInt(stats.collectCount),
    },
    tech: {
      width: toInt(video.width), height: toInt(video.height), ratio: video.ratio ?? null,
      definition: video.definition ?? null, format: video.format ?? null, cover: video.cover ?? null, gears,
    },
    music: { title: music.title ?? null, author: music.authorName ?? null },
  };
}

async function resolve(url) {
  if (!/tiktok\.(com|org)|tiktokv\.com/.test(url || '')) throw { code: 'BAD_URL', message: 'URL harus link TikTok.', status: 400 };
  // ikuti redirect manual agar rantai tercatat
  let cur = url;
  for (let i = 0; i < 10; i++) {
    const r = await fetch(cur, { headers: { 'user-agent': UA }, redirect: 'manual' });
    const loc = r.headers.get('location');
    if (r.status >= 300 && r.status < 400 && loc) { cur = new URL(loc, cur).toString(); continue; }
    break;
  }
  const m = cur.match(VIDEO_RE);
  return { ok: true, finalUrl: cur, username: m ? m[1] : null, videoId: m ? m[2] : null, fetchedAt: Math.floor(Date.now() / 1000) };
}

async function oembed(canonical) {
  const r = await fetch('https://www.tiktok.com/oembed?url=' + encodeURIComponent(canonical), { headers: { 'user-agent': UA } });
  if (!r.ok) throw { code: 'UPSTREAM', message: `oEmbed HTTP ${r.status}`, status: 502 };
  return await r.json();
}

export default {
  async fetch(req, env, ctx) {
    const u = new URL(req.url);
    if (u.pathname === '/api/health') return j({ ok: true, service: 'guoke-proxy-worker', time: Math.floor(Date.now() / 1000) });
    if (!['/api/resolve', '/api/oembed', '/api/video'].includes(u.pathname)) return err('NOT_FOUND', 'Endpoint tidak dikenal.', 404);
    const url = (u.searchParams.get('url') || '').trim();
    if (!url) return err('BAD_URL', 'Parameter ?url= wajib.', 400);

    const cacheKey = new Request(u.toString(), req);
    const cache = caches.default;
    const hit = await cache.match(cacheKey);
    if (hit) {
      const d = await hit.json();
      d.cached = true;
      return j(d);
    }
    const run = async () => {
      if (u.pathname === '/api/resolve') return resolve(url);
      if (u.pathname === '/api/oembed') {
        const o = await oembed(url);
        return { ok: true, oembed: o, fetchedAt: Math.floor(Date.now() / 1000) };
      }
      const r = await resolve(url);
      if (!r.videoId) throw { code: 'BAD_URL', message: `URL final bukan halaman video. URL final: ${r.finalUrl}`, status: 400 };
      const canonical = `https://www.tiktok.com/@${r.username}/video/${r.videoId}`;
      let html = null;
      for (let a = 0; a < 2; a++) {
        const resp = await fetch(canonical, { headers: { 'user-agent': UA, 'accept-language': 'en-US,en;q=0.9' } });
        if (!resp.ok) {
          if (a === 1) throw { code: 'UPSTREAM', message: `Halaman TikTok HTTP ${resp.status}`, status: 502 };
          await new Promise((x) => setTimeout(x, 1500));
          continue;
        }
        html = await resp.text();
        break;
      }
      if (BLOCK.some((m) => html.toLowerCase().includes(m)) && html.length < 200000)
        throw { code: 'TIKTOK_BLOCKED', message: 'TikTok menampilkan verifikasi ke server. Tunggu beberapa menit.', status: 503 };
      const m = html.match(SCRIPT_RE);
      if (!m) throw { code: 'PARSE_CHANGED', message: 'Struktur halaman TikTok berubah. Laporkan agar parser diperbarui.', status: 502 };
      let item;
      try { item = findItem(JSON.parse(m[1]).__DEFAULT_SCOPE__ || {}); }
      catch { throw { code: 'PARSE_CHANGED', message: 'Data JSON TikTok tidak bisa dibaca.', status: 502 }; }
      if (!item) throw { code: 'NOT_FOUND', message: 'Video tidak ditemukan, privat, atau dihapus.', status: 404 };
      let oe = {};
      try { oe = await oembed(canonical); } catch { /* oEmbed opsional */ }
      return {
        ok: true, resolved: r, data: normalize(item),
        oembed: { title: oe.title ?? null, author: oe.author_name ?? null, thumbnail: oe.thumbnail_url ?? null },
        fetchedAt: Math.floor(Date.now() / 1000),
      };
    };
    try {
      const data = await run();
      data.cached = false;
      ctx.waitUntil(cache.put(cacheKey, j(data).clone()));
      const res = j(data);
      res.headers.set('cache-control', `public, max-age=${TTL}`);
      return res;
    } catch (e) {
      if (e && e.code) return err(e.code, e.message, e.status || 502);
      return err('INTERNAL', String(e), 500);
    }
  },
};
