const http = require('node:http');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '../apps/web/out');
const types = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.json':'application/json', '.txt':'text/plain', '.woff2':'font/woff2' };
http.createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (!pathname.startsWith('/ecg-edu/')) { res.writeHead(404); res.end(); return; }
  const file = path.resolve(root, `.${pathname.slice('/ecg-edu'.length)}`, pathname.endsWith('/') ? 'index.html' : '');
  if (!file.startsWith(`${root}${path.sep}`)) { res.writeHead(403); res.end(); return; }
  try { res.setHeader('Content-Type', types[path.extname(file)] ?? 'application/octet-stream'); res.end(await readFile(file)); }
  catch { res.writeHead(404); res.end(); }
}).listen(4173, '127.0.0.1');
