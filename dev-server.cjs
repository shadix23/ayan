// Minimal static server for dist/. No data leaves the device; no API keys here.
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, 'dist');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json',
  '.png': 'image/png', '.webp': 'image/webp', '.webm': 'video/webm', '.mp4': 'video/mp4', '.glb': 'model/gltf-binary', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8' };

// returns an absolute file path strictly inside root, or null
function resolveSafe(url) {
  let p;
  try { p = decodeURIComponent(String(url).split('?')[0]); } catch (e) { return null; }
  if (p.includes('\0')) return null;
  if (p === '/') p = '/index.html';
  const f = path.resolve(root, '.' + p);
  const rel = path.relative(root, f);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return f;
}

const server = http.createServer((req, res) => {
  const f = resolveSafe(req.url);
  if (!f) { res.writeHead(400); return res.end('bad request'); }
  fs.readFile(f, (e, d) => {
    if (e) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(d);
  });
});
module.exports = { resolveSafe };
if (require.main === module) { const port = Number(process.env.PORT) || 4180; server.listen(port, '127.0.0.1', () => console.log('Ayan: http://127.0.0.1:' + port)); }
