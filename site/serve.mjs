// Local preview of the landing page (zero dependencies): node site/serve.mjs [port]
// Mirrors what Vercel serves: clean URLs, /404.html for misses. Not deployed (.vercelignore).
import http from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.argv[2] || process.env.PORT || 4600);
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".png": "image/png", ".mp4": "video/mp4", ".txt": "text/plain; charset=utf-8", ".json": "application/json", ".woff2": "font/woff2" };

const resolve = (urlPath) => {
  let p;
  try { p = decodeURIComponent(urlPath.split("?")[0]); } catch { return null; }
  const abs = path.resolve(ROOT, "." + p);
  if (abs !== ROOT && !abs.startsWith(ROOT + path.sep)) return null;
  for (const c of [abs, path.join(abs, "index.html"), abs + ".html"]) if (existsSync(c) && statSync(c).isFile()) return c;
  return null;
};

http
  .createServer((req, res) => {
    const file = resolve(req.url);
    const target = file ?? path.join(ROOT, "404.html");
    const size = statSync(target).size;
    const type = TYPES[path.extname(target)] ?? "application/octet-stream";
    const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? "");
    if (file && range && path.extname(target) === ".mp4") {
      const start = range[1] ? Number(range[1]) : 0;
      const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
      res.writeHead(206, { "content-type": type, "content-range": `bytes ${start}-${end}/${size}`, "accept-ranges": "bytes", "content-length": end - start + 1 });
      return createReadStream(target, { start, end }).pipe(res);
    }
    res.writeHead(file ? 200 : 404, { "content-type": type, "content-length": size, "accept-ranges": "bytes" });
    if (req.method === "HEAD") return res.end();
    createReadStream(target).pipe(res);
  })
  .listen(PORT, "127.0.0.1", () => console.log(`Landing page: http://127.0.0.1:${PORT}/`));
