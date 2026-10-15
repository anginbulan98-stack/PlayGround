// Guoke Method — server statis lokal (Node bawaan, tanpa dependensi).
// Butuh API Analitik (/api/video)? Pakai server.py sebagai gantinya.
// Cara pakai:  node server.mjs [port]   (default 8080)
// Lalu:         cloudflared tunnel --url http://localhost:8080
// Menjamin: .wasm diserve application/wasm, /vendor/* di-cache immutable,
// index.html + sw.js selalu fresh (no-store), plus /api/health.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = +(process.argv[2] || process.env.PORT || 8080);
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.wasm': 'application/wasm',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};
const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://x');
    if (u.pathname === '/api/health') {
      const need = ['index.html', 'sw.js', 'vendor/ffmpeg.min.js', 'vendor/ffmpeg-core.js', 'vendor/ffmpeg-core.wasm', 'vendor/ffmpeg-core.worker.js'];
      const files = {};
      for (const f of need) {
        try { const st = await fs.stat(path.join(ROOT, f)); files[f] = st.size; }
        catch { files[f] = -1; }
      }
      const body = JSON.stringify({ ok: true, files });
      res.writeHead(200, { 'content-type': MIME['.json'], 'cache-control': 'no-store' });
      res.end(body);
      return;
    }
    let p = decodeURIComponent(u.pathname);
    if (p === '/') p = '/index.html';
    const abs = path.normalize(path.join(ROOT, p));
    if (!abs.startsWith(ROOT)) { res.writeHead(403); res.end('forbidden'); return; }
    let st;
    try { st = await fs.stat(abs); } catch { res.writeHead(404); res.end('not found: ' + p); return; }
    if (st.isDirectory()) { res.writeHead(404); res.end('not found'); return; }
    const ext = path.extname(abs).toLowerCase();
    const h = { 'content-type': MIME[ext] || 'application/octet-stream', 'content-length': st.size };
    if (p.startsWith('/vendor/')) h['cache-control'] = 'public, max-age=31536000, immutable';
    else if (p === '/index.html' || p === '/sw.js') h['cache-control'] = 'no-store';
    else h['cache-control'] = 'public, max-age=3600';
    if (req.method === 'HEAD') { res.writeHead(200, h); res.end(); return; }
    res.writeHead(200, h);
    const fh = await fs.open(abs, 'r');
    fh.createReadStream().on('error', () => { try { res.destroy(); } catch {} }).pipe(res);
  } catch (e) { try { res.writeHead(500); res.end('error'); } catch {} }
});
server.listen(PORT, () => console.log(`[guoke] http://localhost:${PORT}  (/api/health untuk cek file)`));
