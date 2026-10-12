// Serves the site (the folder above this one) like GitHub Pages does: static files, gzip, correct types.
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const root = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 4173);
const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2',
};
const compressible = new Set(['.html', '.css', '.js', '.json', '.svg']);

http.createServer((req, res) => {
  let file = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.readFile(file, (err, body) => {
    if (err) { res.writeHead(404).end('Not found'); return; }
    const ext = path.extname(file).toLowerCase();
    const headers = { 'Content-Type': types[ext] || 'application/octet-stream', 'Cache-Control': 'max-age=600' };
    if (compressible.has(ext) && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) {
      body = zlib.gzipSync(body);
      headers['Content-Encoding'] = 'gzip';
    }
    res.writeHead(200, headers).end(body);
  });
}).listen(port, () => console.log(`Serving ${root} on http://localhost:${port}`));
