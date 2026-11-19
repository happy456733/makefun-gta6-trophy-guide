// GTA VI Trophy Guide — tiny static server for local testing.
// Serves app/ at http://localhost:8080 . Node standard library only, no network.
// Run: node serve.ts
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL(".", import.meta.url));
const appDir = join(rootDir, "app");
const port = Number(process.env.PORT || 8080);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", "http://localhost");
    let path = decodeURIComponent(url.pathname);
    if (path === "/") path = "/index.html";
    const file = join(appDir, path);
    if (!file.startsWith(appDir)) { res.writeHead(403); res.end("forbidden"); return; }
    const data = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("not found");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log("GTA VI Trophy Guide at http://127.0.0.1:" + port);
});
